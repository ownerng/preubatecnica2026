package com.example.portal.metrics;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import com.example.portal.web.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;

import software.amazon.awssdk.core.SdkBytes;
import software.amazon.awssdk.services.lambda.LambdaClient;
import software.amazon.awssdk.services.lambda.model.InvokeRequest;
import software.amazon.awssdk.services.lambda.model.InvokeResponse;

/**
 * Único origen de las métricas: la Lambda. Modo `http` = Runtime Interface Emulator en local,
 * modo `sdk` = invocación real en AWS. Si falla, 502: NO se calculan conteos en Java.
 */
@Component
public class MetricsClient {

    private final String mode;
    private final String url;
    private final String functionName;
    private final LambdaClient lambda;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public MetricsClient(@Value("${METRICS_MODE:http}") String mode,
                         @Value("${METRICS_URL:}") String url,
                         @Value("${METRICS_FUNCTION_NAME:}") String functionName,
                         LambdaClient lambda) {
        this.mode = mode;
        this.url = url;
        this.functionName = functionName;
        this.lambda = lambda;
    }

    public Map<String, Object> fetch() {
        String payload;
        try {
            payload = "sdk".equalsIgnoreCase(mode) ? invokeSdk() : invokeHttp();
        } catch (Exception e) {
            throw unavailable(e.getMessage());
        }
        Map<String, Object> result;
        try {
            result = mapper.readValue(payload, Map.class);
        } catch (Exception e) {
            throw unavailable("respuesta ilegible de la Lambda");
        }
        if (!result.containsKey("total") || !result.containsKey("byStatus")) {
            throw unavailable("la Lambda no devolvió métricas: " + payload);
        }
        return result;
    }

    private String invokeHttp() throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString("{}"))
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IllegalStateException("RIE respondió " + response.statusCode());
        }
        return response.body();
    }

    private String invokeSdk() {
        InvokeResponse response = lambda.invoke(InvokeRequest.builder()
                .functionName(functionName)
                .payload(SdkBytes.fromUtf8String("{}"))
                .build());
        if (response.functionError() != null) {
            throw new IllegalStateException("error en la Lambda: " + response.functionError());
        }
        return response.payload().asUtf8String();
    }

    private ApiException unavailable(String detail) {
        return new ApiException(HttpStatus.BAD_GATEWAY, "METRICS_UNAVAILABLE",
                "No se pudieron obtener las métricas de la Lambda: " + detail);
    }
}
