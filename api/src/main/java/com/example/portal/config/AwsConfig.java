package com.example.portal.config;

import java.net.URI;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.lambda.LambdaClient;

@Configuration
public class AwsConfig {

    /** En local apunta a dynamodb-local; en AWS se deja vacío y usa el endpoint real. */
    @Bean
    DynamoDbClient dynamoDbClient(@Value("${DYNAMODB_ENDPOINT:}") String endpoint,
                                  @Value("${AWS_REGION:us-east-1}") String region) {
        var builder = DynamoDbClient.builder().region(Region.of(region));
        if (!endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }
        return builder.build();
    }

    @Bean
    DynamoDbEnhancedClient dynamoDbEnhancedClient(DynamoDbClient client) {
        return DynamoDbEnhancedClient.builder().dynamoDbClient(client).build();
    }

    /** Solo se usa con METRICS_MODE=sdk (AWS). En local el bean existe pero no se invoca. */
    @Bean
    LambdaClient lambdaClient(@Value("${AWS_REGION:us-east-1}") String region) {
        return LambdaClient.builder().region(Region.of(region)).build();
    }
}
