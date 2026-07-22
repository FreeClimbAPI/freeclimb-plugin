package com.freeclimb.starter;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class WebhookSignatureVerifier {
    private static final long MAX_SKEW_SECONDS = 300;

    private WebhookSignatureVerifier() {}

    public static boolean verify(String rawBody, String header, String signingSecret) {
        if (rawBody == null
                || header == null
                || signingSecret == null
                || signingSecret.isEmpty()) {
            return false;
        }
        Long timestamp = null;
        List<byte[]> signatures = new ArrayList<>();
        for (String item : header.split(",")) {
            int separator = item.indexOf('=');
            if (separator <= 0 || separator == item.length() - 1) {
                continue;
            }
            String name = item.substring(0, separator).trim();
            String value = item.substring(separator + 1).trim();
            if (name.equals("t")) {
                try {
                    timestamp = Long.parseLong(value);
                } catch (NumberFormatException exception) {
                    return false;
                }
            } else if (name.equals("v1")) {
                try {
                    signatures.add(HexFormat.of().parseHex(value));
                } catch (IllegalArgumentException exception) {
                    return false;
                }
            }
        }
        if (timestamp == null || signatures.isEmpty()) {
            return false;
        }
        long now = Instant.now().getEpochSecond();
        if (timestamp < now - MAX_SKEW_SECONDS || timestamp > now + MAX_SKEW_SECONDS) {
            return false;
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(
                    new SecretKeySpec(
                            signingSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] expected =
                    mac.doFinal(
                            (timestamp + "." + rawBody).getBytes(StandardCharsets.UTF_8));
            boolean verified = false;
            for (byte[] signature : signatures) {
                verified |= MessageDigest.isEqual(expected, signature);
            }
            return verified;
        } catch (Exception exception) {
            return false;
        }
    }
}
