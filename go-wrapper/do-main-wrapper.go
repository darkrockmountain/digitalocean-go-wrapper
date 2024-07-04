package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
)

const logOutput = "- "

// htmlErrorResponse represents an error response in HTML format.
type htmlErrorResponse struct {
	body string
}

// Error implements the error interface for htmlErrorResponse.
func (t *htmlErrorResponse) Error() string {
	return t.body
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
func handleResponse(result interface{}) (response string, err error) {
	if result == nil {
		return
	}

	switch v := result.(type) {
	case []byte:
		// If the result is a byte slice, convert it directly to a string.
		// This case handles binary data or simple string responses that are encoded as bytes.
		response = string(v)
	case string:
		// If the result is a string, use it directly.
		// This is the simplest return type, where the function directly returns a string response.
		response = v
	case *http.Response:
		// If the result is an HTTP response, read the body.
		// This case handles HTTP responses, which may include headers, status codes, and body content.
		// The body is read and converted to a string, and the status code is checked for success.
		body, readErr := io.ReadAll(v.Body)
		if readErr != nil {
			err = readErr
			return
		}
		response = string(body)
		if !isSuccessStatusCode(v.StatusCode) {
			err = &htmlErrorResponse{response}
			return
		}
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
		response = string(jsonData)

		var resultMap map[string]interface{}
		unmarshalErr := json.Unmarshal(jsonData, &resultMap)
		if unmarshalErr != nil {
			err = unmarshalErr
			return
		}

		if body, ok := resultMap["body"]; ok {
			response = toString(body)
		}

		if value, ok := resultMap["statusCode"]; ok {
			statusCode, _ := toInt(value)
			if !isSuccessStatusCode(statusCode) {
				err = &htmlErrorResponse{response}
				return
			}
		}
	}

	return
}

// mainFunctionWrapper is a placeholder for the main function logic.
// The `ctx` parameter is a context with values as specified in https://docs.digitalocean.com/products/functions/reference/runtimes/go/#context-parameter
// The `event` parameter is an `any` type that matches https://docs.digitalocean.com/products/functions/reference/runtimes/go/#event-parameter
func mainFunctionWrapper(ctx context.Context, event any) (string, error) {
	panic("mainFunctionWrapper not implemented")
}

// runMain takes context and event arguments as strings, parses them, and runs the main function wrapper.
// The context argument should match https://docs.digitalocean.com/products/functions/reference/runtimes/go/#context-parameter
// The event argument should match https://docs.digitalocean.com/products/functions/reference/runtimes/go/#event-parameter
func runMain(ctxStr, eventStr string) (string, error) {
	event, err := unmarshalEvent[[]byte](eventStr)
	if err != nil {
		return "", fmt.Errorf("Invalid event argument: %w", err)
	}

	ctx := context.Background()

	var contextParam ContextParameter
	err = json.Unmarshal([]byte(ctxStr), &contextParam)
	if err != nil {
		return "", err
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
		if _, ok := err.(*htmlErrorResponse); ok {
			fmt.Fprintln(os.Stderr, err.Error())
		} else {
			fmt.Fprintln(os.Stderr, logOutput+err.Error())
			os.Exit(1)
		}
	} else {
		fmt.Fprintln(os.Stdout, result)
	}
}
