package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
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

// CustomInput represents the structure of the input arguments for the test function
type CustomInput struct {
	Text    string `json:"text"`
	Boolean bool   `json:"boolean"`
	Integer int    `json:"integer"`
}

func getContext(ctx context.Context) map[string]any {
	output := map[string]any{}
	output["activation_id"] = ctx.Value("activation_id")
	output["api_host"] = ctx.Value("api_host")
	output["api_key"] = ctx.Value("api_key")
	output["function_name"] = ctx.Value("function_name")
	output["function_version"] = ctx.Value("function_version")
	output["namespace"] = ctx.Value("namespace")
	output["request_id"] = ctx.Value("request_id")
	return output
}

func Main(ctx context.Context, event CustomInput) Response {
	// Marshal the ctx to JSON
	jsonCtx, err := json.Marshal(getContext(ctx))
	if err != nil {
		log.Fatalf("Error marshaling ctx: %v", err)
	}
	// Marshal the event to JSON
	jsonEvent, err := json.Marshal(event)
	if err != nil {
		log.Fatalf("Error marshaling struct: %v", err)
	}

	return generateResponse(http.StatusOK, fmt.Sprintf("Executed successfully with ctx: %s, event: %s", string(jsonCtx), string(jsonEvent)))

}
