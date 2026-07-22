package com.freeclimb.starter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.freeclimbapi.models.GetDigits;
import com.github.freeclimbapi.models.PerclScript;
import com.github.freeclimbapi.models.Say;
import com.github.freeclimbapi.models.Sms;
import java.net.URI;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class WebhookController {
    private static final Set<String> STOP_WORDS =
            Set.of("STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT");
    private final FreeClimbConfiguration.StarterSettings settings;
    private final ObjectMapper objectMapper;

    public WebhookController(
            FreeClimbConfiguration.StarterSettings settings, ObjectMapper objectMapper) {
        this.settings = settings;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/health")
    Map<String, String> health() {
        return Map.of("status", "ok", "baseUrl", settings.baseUrl());
    }

    @PostMapping(value = "/voice", produces = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<String> voice(
            @RequestBody String body,
            @RequestHeader(value = "freeclimb-signature", required = false) String signature)
            throws Exception {
        if (!verified(body, signature)) {
            return ResponseEntity.status(401).build();
        }
        PerclScript script =
                new PerclScript()
                        .addCommand(
                                new GetDigits()
                                        .actionUrl(URI.create(settings.baseUrl() + "/menu"))
                                        .maxDigits(1)
                                        .prompts(
                                                List.of(
                                                        new Say()
                                                                .text(
                                                                        "Press one to continue."))));
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(script.toJson());
    }

    @PostMapping(value = "/menu", produces = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<String> menu(
            @RequestBody String body,
            @RequestHeader(value = "freeclimb-signature", required = false) String signature)
            throws Exception {
        if (!verified(body, signature)) {
            return ResponseEntity.status(401).build();
        }
        PerclScript script =
                new PerclScript().addCommand(new Say().text("Thanks. Your selection was received."));
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(script.toJson());
    }

    @PostMapping(value = "/sms-inbound", produces = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<String> sms(
            @RequestBody String body,
            @RequestHeader(value = "freeclimb-signature", required = false) String signature)
            throws Exception {
        if (!verified(body, signature)) {
            return ResponseEntity.status(401).build();
        }
        JsonNode payload = objectMapper.readTree(body);
        String from = payload.path("from").asText("");
        if (from.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        String incomingText = payload.path("text").asText("").trim();
        String normalizedText = incomingText.toUpperCase(Locale.ROOT);
        String reply;
        if (STOP_WORDS.contains(normalizedText)) {
            reply =
                    "You are unsubscribed and will receive no more messages. Reply HELP for help.";
        } else if (normalizedText.equals("HELP") || normalizedText.equals("INFO")) {
            reply = "FreeClimb starter help. Reply STOP to unsubscribe.";
        } else {
            reply = "FreeClimb starter: Thanks for your message. Reply HELP for help or STOP to unsubscribe.";
        }
        PerclScript script =
                new PerclScript()
                        .addCommand(
                                new Sms()
                                        .to(from)
                                        .from(settings.freeClimbNumber())
                                        .text(reply));
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(script.toJson());
    }

    private boolean verified(String body, String signature) {
        return WebhookSignatureVerifier.verify(body, signature, settings.signingSecret());
    }
}
