require "json"
require "openssl"
require "uri"

require "dotenv/load"
require "freeclimb"
require "sinatra/base"

module FreeClimbStarter
  BASE_URL = ENV.fetch("BASE_URL").sub(%r{/$}, "")
  BASE_URI = URI.parse(BASE_URL)
  raise ArgumentError, "BASE_URL must be an absolute HTTPS URL" unless BASE_URI.is_a?(URI::HTTPS) && BASE_URI.host

  CONFIGURATION = Freeclimb::Configuration.new do |config|
    config.username = ENV.fetch("FREECLIMB_ACCOUNT_ID")
    config.password = ENV.fetch("FREECLIMB_API_KEY")
  end
  API = Freeclimb::DefaultApi.new(Freeclimb::ApiClient.new(CONFIGURATION))

  class App < Sinatra::Base
    before "/voice" do
      verify_signature
    end

    before "/menu" do
      verify_signature
    end

    before "/sms-inbound" do
      verify_signature
    end

    get "/health" do
      json_response(status: "ok", baseUrl: BASE_URL)
    end

    post "/voice" do
      percl_response([
        Freeclimb::GetDigits.new(
          action_url: "#{BASE_URL}/menu",
          prompts: [Freeclimb::Say.new(text: "Press one to continue.")],
          max_digits: 1
        )
      ])
    end

    post "/menu" do
      percl_response([
        Freeclimb::Say.new(text: "Thanks for calling FreeClimb.")
      ])
    end

    post "/sms-inbound" do
      payload = parsed_body
      text = payload.fetch("text", "").strip.upcase
      reply = if text == "STOP"
                "You are unsubscribed and will receive no more messages. Reply HELP for help."
              else
                "Thanks for your message."
              end
      percl_response([
        Freeclimb::Sms.new(
          to: payload.fetch("from"),
          from: ENV.fetch("FREECLIMB_NUMBER"),
          text: reply
        )
      ])
    end

    private

    def raw_body
      @raw_body ||= begin
        request.body.rewind
        body = request.body.read
        request.body.rewind
        body
      end
    end

    def parsed_body
      JSON.parse(raw_body)
    end

    def verify_signature
      timestamp, signatures = signature_parts(request.env["HTTP_FREECLIMB_SIGNATURE"])
      raise "invalid timestamp" if (Time.now.to_i - timestamp).abs > 300

      expected = OpenSSL::HMAC.hexdigest(
        "sha256",
        ENV.fetch("FREECLIMB_SIGNING_SECRET"),
        "#{timestamp}.#{raw_body}"
      )
      valid = signatures.reduce(false) do |matched, signature|
        comparison = signature.bytesize == expected.bytesize &&
                     OpenSSL.fixed_length_secure_compare(signature, expected)
        comparison || matched
      end
      raise "invalid signature" unless valid
    rescue StandardError
      halt 401, json_response(error: "invalid signature")
    end

    def signature_parts(header)
      timestamps = []
      signatures = []
      header.to_s.split(",").each do |part|
        key, value = part.strip.split("=", 2)
        timestamps << value if key == "t"
        signatures << value if key == "v1"
      end
      raise "invalid signature header" unless timestamps.length == 1 && signatures.any?
      raise "invalid timestamp" unless timestamps.first.match?(/\A\d+\z/)

      [Integer(timestamps.first, 10), signatures]
    end

    def percl_response(commands)
      content_type :json
      Freeclimb::PerclScript.new(commands: commands).to_json
    end

    def json_response(value)
      content_type :json
      JSON.generate(value)
    end
  end
end
