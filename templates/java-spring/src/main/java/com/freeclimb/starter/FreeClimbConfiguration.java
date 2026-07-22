package com.freeclimb.starter;

import com.github.freeclimbapi.ApiClient;
import com.github.freeclimbapi.DefaultApi;
import java.net.URI;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

@Configuration
public class FreeClimbConfiguration {
    @Bean
    StarterSettings starterSettings(Environment environment) {
        String baseUrl = required(environment, "BASE_URL");
        URI uri = URI.create(baseUrl);
        if (!uri.isAbsolute()
                || !"https".equalsIgnoreCase(uri.getScheme())
                || uri.getHost() == null
                || uri.getQuery() != null
                || uri.getFragment() != null) {
            throw new IllegalArgumentException("BASE_URL must be an absolute HTTPS URL");
        }
        return new StarterSettings(
                baseUrl.replaceAll("/+$", ""),
                required(environment, "FREECLIMB_SIGNING_SECRET"),
                required(environment, "FREECLIMB_NUMBER"),
                required(environment, "FREECLIMB_ACCOUNT_ID"),
                required(environment, "FREECLIMB_API_KEY"));
    }

    @Bean
    DefaultApi freeClimbApi(StarterSettings settings) {
        ApiClient client = new ApiClient();
        client.setAccountId(settings.accountId());
        client.setApiKey(settings.apiKey());
        return new DefaultApi(client);
    }

    private static String required(Environment environment, String name) {
        String value = environment.getProperty(name);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " is required");
        }
        return value;
    }

    record StarterSettings(
            String baseUrl,
            String signingSecret,
            String freeClimbNumber,
            String accountId,
            String apiKey) {}
}
