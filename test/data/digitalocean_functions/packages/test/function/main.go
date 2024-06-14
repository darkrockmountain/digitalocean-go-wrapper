package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

type ResponseHeaders struct {
	ContentType string `json:"Content-Type"`
}

type Response struct {
	Body       string          `json:"body"`
	StatusCode string          `json:"statusCode"`
	Headers    ResponseHeaders `json:"headers"`
}

func generateResponse(code int, body string) Response {
	return Response{
		Headers:    ResponseHeaders{ContentType: "text/html"},
		StatusCode: fmt.Sprintf("%d", code),
		Body:       body,
	}
}

func Main(ctx context.Context, jsonData []byte) Response {

	var jsonMap map[string]any

	err := json.Unmarshal(jsonData, &jsonMap)
	if err != nil {
		return generateResponse(http.StatusInternalServerError, fmt.Sprintf("Error unmarshaling from JSON: %v", err))

	}

	return generateResponse(http.StatusOK, "Executed successfully")
}
