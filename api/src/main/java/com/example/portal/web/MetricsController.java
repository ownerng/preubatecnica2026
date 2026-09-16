package com.example.portal.web;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.portal.metrics.MetricsClient;

@RestController
@RequestMapping("/api/metrics")
public class MetricsController {

    private final MetricsClient client;

    public MetricsController(MetricsClient client) {
        this.client = client;
    }

    /** Reenvía tal cual lo que calcula la Lambda y marca el origen. */
    @GetMapping
    public Map<String, Object> metrics() {
        Map<String, Object> out = new LinkedHashMap<>(client.fetch());
        out.put("source", "lambda");
        return out;
    }
}
