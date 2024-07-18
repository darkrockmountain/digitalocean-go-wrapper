package main

import (
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

func Main(event CustomInput) Response {

	// Marshal the event to JSON
	jsonEvent, err := json.Marshal(event)
	if err != nil {
		log.Fatalf("Error marshaling struct: %v", err)
	}

	return generateResponse(http.StatusOK, fmt.Sprintf("Executed successfully with ctx: %s, event: %s", "", string(jsonEvent)))

}
