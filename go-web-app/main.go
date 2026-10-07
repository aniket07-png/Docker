package main

import (
	"fmt"
	"log"
	"net/http"
	"time"
)

func main() {
	// 1. Serve static files from the ./static directory
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)

	// 2. Sample API endpoint (e.g., to feed dynamic 3D data)
	http.HandleFunc("/api/data", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{"status": "online", "timestamp": "%s"}`, time.Now().Format(time.RFC3339))
	})

	port := ":8080"
	fmt.Printf("🚀 3D Web Server running at http://localhost%s\n", port)
	
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

