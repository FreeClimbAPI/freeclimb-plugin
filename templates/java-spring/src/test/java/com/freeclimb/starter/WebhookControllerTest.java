package com.freeclimb.starter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

@SpringBootTest
@AutoConfigureMockMvc
class WebhookControllerTest {
    private static final String SECRET = "test-signing-secret";
    private static final JsonNode FIXTURE = loadFixture();

    @Autowired private MockMvc mockMvc;

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("BASE_URL", () -> FIXTURE.path("baseUrl").asText());
        registry.add("FREECLIMB_SIGNING_SECRET", () -> SECRET);
        registry.add(
                "FREECLIMB_NUMBER",
                () -> FIXTURE.path("sms").path("request").path("to").asText());
        registry.add("FREECLIMB_ACCOUNT_ID", () -> "ACtest");
        registry.add("FREECLIMB_API_KEY", () -> "test-api-key");
    }

    @Test
    void healthRouteReturnsStatus() throws Exception {
        JsonNode health = FIXTURE.path("health");
        mockMvc.perform(get(health.path("path").asText()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(health.path("status").asText()))
                .andExpect(jsonPath("$.baseUrl").value(FIXTURE.path("baseUrl").asText()));
    }

    @Test
    void voiceRouteReturnsSdkPercl() throws Exception {
        JsonNode voice = FIXTURE.path("voice");
        String command = voice.path("requiredCommand").asText();
        String body = voice.path("request").toString();
        mockMvc.perform(
                        post(voice.path("path").asText())
                                .contentType(MediaType.APPLICATION_JSON)
                                .header("freeclimb-signature", signature(body))
                                .content(body))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(
                        jsonPath("$[0]." + command + ".actionUrl")
                                .value(voice.path("actionUrl").asText()))
                .andExpect(
                        jsonPath("$[0]." + command + ".maxDigits")
                                .value(voice.path("maxDigits").asInt()));
    }

    @Test
    void smsRouteReturnsSdkPercl() throws Exception {
        JsonNode sms = FIXTURE.path("sms");
        String command = sms.path("requiredCommand").asText();
        String body = sms.path("request").toString();
        mockMvc.perform(
                        post(sms.path("path").asText())
                                .contentType(MediaType.APPLICATION_JSON)
                                .header("freeclimb-signature", signature(body))
                                .content(body))
                .andExpect(status().isOk())
                .andExpect(
                        jsonPath("$[0]." + command + ".to")
                                .value(sms.path("request").path("from").asText()))
                .andExpect(
                        jsonPath("$[0]." + command + ".from")
                                .value(sms.path("request").path("to").asText()))
                .andExpect(
                        jsonPath("$[0]." + command + ".text")
                                .value(sms.path("replyText").asText()));
    }

    @Test
    void webhookRejectsInvalidSignature() throws Exception {
        mockMvc.perform(
                        post("/voice")
                                .contentType(MediaType.APPLICATION_JSON)
                                .header("freeclimb-signature", "t=1,v1=invalid")
                                .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void manualVerifierAcceptsValidSignatureAmongAllV1Values() throws Exception {
        String body = "{\"requestType\":\"test\"}";
        assertTrue(WebhookSignatureVerifier.verify(body, signature(body), SECRET));
    }

    @Test
    void webhookRejectsFutureTimestamp() throws Exception {
        JsonNode voice = FIXTURE.path("voice");
        String body = voice.path("request").toString();
        long futureTimestamp = Instant.now().getEpochSecond() + 600;
        mockMvc.perform(
                        post(voice.path("path").asText())
                                .contentType(MediaType.APPLICATION_JSON)
                                .header(
                                        "freeclimb-signature",
                                        signature(body, futureTimestamp))
                                .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void apiKeyIsRequiredAtStartup() {
        MockEnvironment environment =
                new MockEnvironment()
                        .withProperty("BASE_URL", FIXTURE.path("baseUrl").asText())
                        .withProperty("FREECLIMB_SIGNING_SECRET", SECRET)
                        .withProperty(
                                "FREECLIMB_NUMBER",
                                FIXTURE.path("sms").path("request").path("to").asText())
                        .withProperty("FREECLIMB_ACCOUNT_ID", "ACtest");
        IllegalArgumentException exception =
                assertThrows(
                        IllegalArgumentException.class,
                        () -> new FreeClimbConfiguration().starterSettings(environment));
        assertEquals("FREECLIMB_API_KEY is required", exception.getMessage());
    }

    private static String signature(String body) throws Exception {
        return signature(body, Instant.now().getEpochSecond());
    }

    private static String signature(String body, long timestamp) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest =
                mac.doFinal((timestamp + "." + body).getBytes(StandardCharsets.UTF_8));
        return "t="
                + timestamp
                + ",v1="
                + "00".repeat(32)
                + ",v1="
                + HexFormat.of().formatHex(digest);
    }

    private static JsonNode loadFixture() {
        try (InputStream stream =
                WebhookControllerTest.class
                        .getClassLoader()
                        .getResourceAsStream("contract-fixtures.json")) {
            if (stream == null) {
                throw new IllegalStateException("contract-fixtures.json is required");
            }
            return new ObjectMapper().readTree(stream);
        } catch (IOException exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }
}
