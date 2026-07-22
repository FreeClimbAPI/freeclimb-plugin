require "json"
require "openssl"

CONTRACT = JSON.parse(File.read(File.expand_path("../../contract-fixtures.json", __dir__)))

ENV["BASE_URL"] = CONTRACT.fetch("baseUrl")
ENV["FREECLIMB_ACCOUNT_ID"] = "AC_TEST"
ENV["FREECLIMB_API_KEY"] = "test-api-key"
ENV["FREECLIMB_NUMBER"] = CONTRACT.dig("sms", "request", "to")
ENV["FREECLIMB_SIGNING_SECRET"] = "test-signing-secret"
ENV["RACK_ENV"] = "test"

require "rack/test"
require "rspec"
require_relative "../app"

RSpec.describe FreeClimbStarter::App do
  include Rack::Test::Methods

  def app
    described_class
  end

  def signed_post(path, payload, timestamp: Time.now.to_i)
    body = JSON.generate(payload)
    signature = OpenSSL::HMAC.hexdigest(
      "sha256",
      ENV.fetch("FREECLIMB_SIGNING_SECRET"),
      "#{timestamp}.#{body}"
    )
    header "FreeClimb-Signature", "t=#{timestamp},v1=invalid,v1=#{signature}"
    post path, body, "CONTENT_TYPE" => "application/json"
  end

  it "constructs the SDK client from the environment" do
    expect(FreeClimbStarter::API).to be_a(Freeclimb::DefaultApi)
    expect(FreeClimbStarter::CONFIGURATION.username).to eq("AC_TEST")
    expect(FreeClimbStarter::CONFIGURATION.password).to eq("test-api-key")
  end

  it "serves health" do
    get CONTRACT.dig("health", "path")

    expect(last_response).to be_ok
    expect(JSON.parse(last_response.body)).to eq(
      "status" => CONTRACT.dig("health", "status"),
      "baseUrl" => CONTRACT.fetch("baseUrl")
    )
  end

  it "returns SDK-native voice PerCL" do
    signed_post(CONTRACT.dig("voice", "path"), CONTRACT.dig("voice", "request"))

    expect(last_response).to be_ok
    command = JSON.parse(last_response.body).first.fetch(CONTRACT.dig("voice", "requiredCommand"))
    expect(command.fetch("actionUrl")).to eq(CONTRACT.dig("voice", "actionUrl"))
    expect(command.fetch("maxDigits")).to eq(CONTRACT.dig("voice", "maxDigits"))
  end

  it "returns SDK-native SMS PerCL" do
    signed_post(CONTRACT.dig("sms", "path"), CONTRACT.dig("sms", "request"))

    expect(last_response).to be_ok
    command = JSON.parse(last_response.body).first.fetch(CONTRACT.dig("sms", "requiredCommand"))
    expect(command.fetch("to")).to eq(CONTRACT.dig("sms", "request", "from"))
    expect(command.fetch("from")).to eq(CONTRACT.dig("sms", "request", "to"))
    expect(command.fetch("text")).to eq(CONTRACT.dig("sms", "replyText"))
  end

  it "rejects an invalid signature" do
    header "FreeClimb-Signature", "t=#{Time.now.to_i},v1=invalid"
    post(
      CONTRACT.dig("voice", "path"),
      JSON.generate(CONTRACT.dig("voice", "request")),
      "CONTENT_TYPE" => "application/json"
    )

    expect(last_response.status).to eq(401)
  end

  it "rejects a future timestamp" do
    signed_post(
      CONTRACT.dig("voice", "path"),
      CONTRACT.dig("voice", "request"),
      timestamp: Time.now.to_i + 301
    )

    expect(last_response.status).to eq(401)
  end
end
