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
)

const errorOutputSeparator = "ERR: "

// Define the ContextParameter struct
type ContextParameter struct {
	ActivationID    string `json:"activation_id"`
	APIHost         string `json:"api_host"`
	APIKey          string `json:"api_key"`
	FunctionName    string `json:"function_name"`
	FunctionVersion string `json:"function_version"`
	Namespace       string `json:"namespace"`
	RequestID       string `json:"request_id"`
}

// isSuccessStatusCode checks if the HTTP status code indicates success.
func isSuccessStatusCode(statusCode int) bool {
	return statusCode >= 200 && statusCode < 300
}

// isErrorStatusCode checks if the HTTP status code indicates an error.
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

// toInt function to safely cast any to int
func toInt(intAny any) (int, error) {
	switch v := intAny.(type) {
	case int:
		return v, nil
	case int8:
		return int(v), nil
	case int16:
		return int(v), nil
	case int32:
		return int(v), nil
	case int64:
		return int(v), nil
	case uint:
		return int(v), nil
	case uint8:
		return int(v), nil
	case uint16:
		return int(v), nil
	case uint32:
		return int(v), nil
	case uint64:
		if v > uint64(^uint(0)>>1) {
			return 0, fmt.Errorf("value is too large for int type")
		}
		return int(v), nil
	case float32:
		return int(v), nil
	case float64:
		return int(v), nil
	case string:
		return strconv.Atoi(v)
	default:
		return 0, fmt.Errorf("value is not convertible to int")
	}
}

func unmarshalEvent[T any](eventArgs string) (T, error) {
	var event T

	// Special case for []byte type
	if _, ok := any(event).([]byte); ok {
		return any([]byte(eventArgs)).(T), nil
	}

	err := json.Unmarshal([]byte(eventArgs), &event)
	return event, err
}

func handleResponse(result interface{}) (string, error) {
	if result == nil {
		return "", nil
	}

	var jsonResponse string
	var err error

	switch v := result.(type) {
	case []byte:
		jsonResponse = string(v)
	case string:
		jsonResponse = v
	case *http.Response:

		body, readErr := io.ReadAll(v.Body)
		if readErr != nil {
			log.Fatal(readErr)
		}
		jsonResponse = string(body)
		if !isSuccessStatusCode(v.StatusCode) {
			err = fmt.Errorf("https status code %v", v.StatusCode)
		}
	default:
		// cast to map as default

		// Marshal the struct to JSON
		jsonData, marshalErr := json.Marshal(v)
		if marshalErr != nil {
			return marshalErr.Error(), marshalErr
		}

		// Unmarshal the JSON to a map[string]interface{}
		var resultMap map[string]interface{}
		unmarshalErr := json.Unmarshal(jsonData, &resultMap)
		if unmarshalErr != nil {
			return unmarshalErr.Error(), unmarshalErr
		}

		if value, ok := resultMap["statusCode"]; ok {
			statusCode, _ := toInt(value)
			if !isSuccessStatusCode(statusCode) {
				err = fmt.Errorf("https status code %v", statusCode)
			}
		}
		if body, ok := resultMap["body"]; ok {
			jsonResponse = toString(body)
		} else {
			//if resultMap has no body tag just return all the result map as the response body
			jsonResponse = string(jsonData)
		}
	}

	return string(jsonResponse), err
}

func mainFunctionWrapper(ctx context.Context, event any) (string, error) {
	panic("mainFunctionWrapper not implemented")
}

func main() {
	if len(os.Args) < 3 {
		log.Fatal("Not enough arguments provided")
	}

	event, err := unmarshalEvent[[]byte](os.Args[2])
	if err != nil {
		log.Fatal("Invalid event argument")
	}

	ctx := context.Background()

	var contextParam ContextParameter
	err = json.Unmarshal([]byte(os.Args[1]), &contextParam)
	if err != nil {
		log.Fatal(err)
	}

	// setting the context values
	// https://docs.digitalocean.com/products/functions/reference/runtimes/go/#context-parameter
	ctx = context.WithValue(ctx, "activation_id", contextParam.ActivationID)
	ctx = context.WithValue(ctx, "api_host", contextParam.APIHost)
	ctx = context.WithValue(ctx, "api_key", contextParam.APIKey)
	ctx = context.WithValue(ctx, "function_name", contextParam.FunctionName)
	ctx = context.WithValue(ctx, "function_version", contextParam.FunctionVersion)
	ctx = context.WithValue(ctx, "namespace", contextParam.Namespace)
	ctx = context.WithValue(ctx, "request_id", contextParam.RequestID)

	result, err := mainFunctionWrapper(ctx, event)

	if err != nil { //the error returned by mainFunctionWrapper is an output error otherwise the log.Fatal has been triggered.
		result = errorOutputSeparator + result
	} else {

	}

	fmt.Println(result)
}
