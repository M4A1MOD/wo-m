package com.zhixue.platform.controller;

import com.zhixue.platform.common.ApiResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.ResourceAccessException;

@RestControllerAdvice(assignableTypes = AiLessonController.class)
public class AiExceptionHandler {
    @ExceptionHandler(RestClientResponseException.class)
    public ResponseEntity<ApiResponse<Void>> upstreamError(RestClientResponseException exception) {
        int upstreamStatus = exception.getStatusCode().value();
        boolean invalidRequest = upstreamStatus == 400 || upstreamStatus == 422;
        int status = invalidRequest ? 400 : upstreamStatus == 503 || upstreamStatus == 504 ? upstreamStatus : 502;
        String message = invalidRequest ? "AI 请求参数不符合要求" : "AI 服务返回异常，请稍后重试";
        try {
            var detail = new ObjectMapper().readTree(exception.getResponseBodyAsString()).path("detail");
            if (detail.isTextual()) message = detail.asText();
        } catch (JsonProcessingException ignored) {
            message = "AI 服务返回异常，请稍后重试";
        }
        return ResponseEntity.status(status).body(new ApiResponse<>(
            invalidRequest ? "AI_INVALID_REQUEST" : "AI_UPSTREAM_ERROR",
            message, null));
    }

    @ExceptionHandler(ResourceAccessException.class)
    public ResponseEntity<ApiResponse<Void>> unavailable(ResourceAccessException exception) {
        return ResponseEntity.status(503).body(new ApiResponse<>(
            "AI_UNAVAILABLE", "AI 服务暂时无法连接，请稍后重试", null));
    }
}
