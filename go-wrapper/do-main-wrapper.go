package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
)

const logOutput = "- "

// DoGoWrapperResponse represents the structure of the HTTP response returned by a DigitalOcean function.
type DoGoWrapperResponse struct {
	// Body contains the main content of the response.
	// It can be of any type, typically string or JSON object.
	Body interface{} `json:"body,omitempty"`

	// StatusCode represents the HTTP status code for the response.
	// For example, 200 for success, 404 for not found, etc.
	StatusCode int `json:"statusCode,omitempty"`

	// Headers contains the HTTP headers for the response.
	// It is a map where the key is the header name and the value is the header value.
	Headers map[string]string `json:"headers,omitempty"`
}

// ContextParameter represents the structure for context parameters.
type ContextParameter struct {
	ActivationID    string `json:"activation_id"`
	APIHost         string `json:"api_host"`
	APIKey          string `json:"api_key"`
	FunctionName    string `json:"function_name"`
	FunctionVersion string `json:"function_version"`
	Namespace       string `json:"namespace"`
	RequestID       string `json:"request_id"`
}

// isSuccessStatusCode checks if the HTTP status code indicates success (2xx).
func isSuccessStatusCode(statusCode int) bool {
	return statusCode >= 200 && statusCode < 300
}

// isErrorStatusCode checks if the HTTP status code indicates an error (4xx or 5xx).
func isErrorStatusCode(statusCode int) bool {
	return statusCode >= 400 && statusCode < 600
}

// toString attempts to cast an interface{} to a string. If unsuccessful, it marshals the value to JSON and converts it to a string.
func toString(something interface{}) string {
	if str, ok := something.(string); ok {
		return str
	}
	bodyBytes, err := json.Marshal(something)
	if err != nil {
		return ""
	}
	return string(bodyBytes)
}

// toInt safely casts any type to an int.
func toInt(intAny any) (int, error) {
	switch v := intAny.(type) {
	case int:
		return v, nil
	case int8, int16, int32, int64:
		return int(v.(int64)), nil
	case uint, uint8, uint16, uint32, uint64:
		if v.(uint64) > uint64(^uint(0)>>1) {
			return 0, fmt.Errorf("value is too large for int type")
		}
		return int(v.(uint64)), nil
	case float32, float64:
		return int(v.(float64)), nil
	case string:
		return strconv.Atoi(v)
	default:
		return 0, fmt.Errorf("value is not convertible to int")
	}
}

// Convert http.Header (map[string][]string) to map[string]string
func convertHeaderToMapString(header http.Header) map[string]string {
	result := make(map[string]string)
	for key, values := range header {
		// Concatenate all values for the key into a single string
		result[key] = strings.Join(values, ", ")
	}
	return result
}

// unmarshalEvent unmarshals a JSON string into the specified type T.
func unmarshalEvent[T any](eventArgs string) (T, error) {
	var event T

	// Special case for []byte type
	if _, ok := any(event).([]byte); ok {
		return any([]byte(eventArgs)).(T), nil
	}

	err := json.Unmarshal([]byte(eventArgs), &event)
	return event, err
}

// handleResponse processes the result and converts it to a JSON string or error.
// The function supports several return types as per DigitalOcean Functions Go runtime specifications.
// Refer to: https://docs.digitalocean.com/products/functions/reference/runtimes/go/#returns
func handleResponse(result interface{}) (response *DoGoWrapperResponse, err error) {
	if result == nil {
		return &DoGoWrapperResponse{StatusCode: http.StatusAccepted}, nil
	}

	switch v := result.(type) {
	case []byte:
		// If the result is a byte slice, convert it directly to a string.
		// This case handles binary data or simple string responses that are encoded as bytes.
		response = &DoGoWrapperResponse{Body: v, StatusCode: http.StatusAccepted}
	case string:
		// If the result is a string, use it directly.
		// This is the simplest return type, where the function directly returns a string response.
		response = &DoGoWrapperResponse{Body: v, StatusCode: http.StatusAccepted}
	case *http.Response, http.Response:

		pHResponse, ok := v.(*http.Response)
		if !ok {
			hResponse := v.(http.Response)
			pHResponse = &hResponse
		}

		defer pHResponse.Body.Close()

		// If the result is an HTTP response, read the body.
		// This case handles HTTP responses, which may include headers, status codes, and body content.
		// The body is read and converted to a string, and the status code is checked for success.
		body, readErr := io.ReadAll(pHResponse.Body)
		if readErr != nil {
			err = readErr
			return
		}

		response = &DoGoWrapperResponse{Body: string(body), StatusCode: pHResponse.StatusCode, Headers: convertHeaderToMapString(pHResponse.Header)}

	default:
		// Default case: attempt to marshal the result to JSON and process it as a map.
		// This case handles structured data, typically returned as a struct or a map.
		// The data is marshaled to JSON, and specific keys like "body" and "statusCode" are processed.
		jsonData, marshalErr := json.Marshal(v)
		if marshalErr != nil {
			err = marshalErr
			return
		}
		// Temporarily set the response as jsonData in case further processing fails.
		response = &DoGoWrapperResponse{Body: string(jsonData), StatusCode: http.StatusAccepted}

		var resultMap map[string]interface{}
		unmarshalErr := json.Unmarshal(jsonData, &resultMap)
		if unmarshalErr != nil {
			err = unmarshalErr
			return
		}

		if body, ok := resultMap["body"]; ok {
			response.Body = body
		}

		if value, ok := resultMap["statusCode"]; ok {
			statusCode, _ := toInt(value)
			response.StatusCode = statusCode
		}

		// Check the type of headers and handle accordingly
		if headers, ok := resultMap["headers"]; ok {
			switch h := headers.(type) {
			case string:
				var headersMap map[string]string
				unmarshalErr := json.Unmarshal([]byte(h), &headersMap)
				if unmarshalErr != nil {
					err = unmarshalErr
					return
				}
				fmt.Println("Headers Map (from string):", headersMap)
			case map[string]interface{}:
				// Convert map[string]interface{} to map[string]string
				headersMap := make(map[string]string)
				for k, v := range h {
					if strVal, ok := v.(string); ok {
						headersMap[k] = strVal
					} else {
						fmt.Fprintln(os.Stderr, "Handling response: Header value is not a string:", k, v)
					}
				}
			default:
				fmt.Fprintln(os.Stderr, "Handling response: Unhandled type for headers:", h)
			}
		}

	}

	return
}

// mainFunctionWrapper is a placeholder for the main function logic.
// The `ctx` parameter is a context with values as specified in https://docs.digitalocean.com/products/functions/reference/runtimes/go/#context-parameter
// The `event` parameter is an `any` type that matches https://docs.digitalocean.com/products/functions/reference/runtimes/go/#event-parameter
func mainFunctionWrapper(ctx context.Context, event any) (*DoGoWrapperResponse, error) {
	panic("mainFunctionWrapper not implemented")
}

// runMain takes context and event arguments as strings, parses them, and runs the main function wrapper.
// The context argument should match https://docs.digitalocean.com/products/functions/reference/runtimes/go/#context-parameter
// The event argument should match https://docs.digitalocean.com/products/functions/reference/runtimes/go/#event-parameter
func runMain(ctxStr, eventStr string) (*DoGoWrapperResponse, error) {
	event, err := unmarshalEvent[[]byte](eventStr)
	if err != nil {
		return nil, fmt.Errorf("Invalid event argument: %w", err)
	}

	ctx := context.Background()

	var contextParam ContextParameter
	err = json.Unmarshal([]byte(ctxStr), &contextParam)
	if err != nil {
		return nil, err
	}

	// Setting the context values based on DigitalOcean Functions context parameters
	// Reference: https://docs.digitalocean.com/products/functions/reference/runtimes/go/#context-parameter
	ctx = context.WithValue(ctx, "activation_id", contextParam.ActivationID)
	ctx = context.WithValue(ctx, "api_host", contextParam.APIHost)
	ctx = context.WithValue(ctx, "api_key", contextParam.APIKey)
	ctx = context.WithValue(ctx, "function_name", contextParam.FunctionName)
	ctx = context.WithValue(ctx, "function_version", contextParam.FunctionVersion)
	ctx = context.WithValue(ctx, "namespace", contextParam.Namespace)
	ctx = context.WithValue(ctx, "request_id", contextParam.RequestID)

	return mainFunctionWrapper(ctx, event)
}

// main is the entry point of the program. It takes command-line arguments, parses them, and runs the main function logic.
// The main function expects at least two command-line arguments:
// 1. Context parameter (string): JSON string that matches the DigitalOcean Functions context parameter structure.
// 2. Event parameter (string): JSON string that matches the DigitalOcean Functions event parameter structure.
func main() {
	if len(os.Args) < 3 {
		fmt.Fprintln(os.Stderr, "Not enough arguments provided")
		os.Exit(1)
	}
	result, err := runMain(os.Args[1], os.Args[2])
	if err != nil {
		fmt.Fprintln(os.Stderr, logOutput+err.Error())
		printResponse(os.Stderr, result)
		os.Exit(1)
	} else {
		printResponse(os.Stdout, result)
	}
}

func printResponse(writer io.Writer, response *DoGoWrapperResponse) {

	// Get delimiters from environment variables or use default values
	startDelimiter := os.Getenv("START_DELIMITER")
	if startDelimiter == "" {
		startDelimiter = "<<<<<<<<<<<<<<<response<<<<<<<<<<<<<<<"
	}

	endDelimiter := os.Getenv("END_DELIMITER")
	if endDelimiter == "" {
		endDelimiter = ">>>>>>>>>>>>>>>response>>>>>>>>>>>>>>>"
	}

	// Marshal the response to JSON
	jsonData, err := json.MarshalIndent(response, "", "  ")
	if err != nil {
		log.Panicf("Error marshalling DoGoWrapperResponse to JSON:", err)
	}

	// Print the custom wrapped JSON response
	fmt.Fprintln(writer, startDelimiter)
	fmt.Fprintln(writer, string(jsonData))
	fmt.Fprintln(writer, endDelimiter)

}
