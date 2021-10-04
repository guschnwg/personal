package app

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gorilla/websocket"
)

func givenHub() Hub {
	return Hub{
		upgrader: websocket.Upgrader{},
		clients:  make(map[*Client]bool),
		rooms:    make(map[string]Clients),
	}
}

func givenHandler(hub Hub) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		c, _ := hub.upgrader.Upgrade(w, r, nil)
		client := &Client{&hub, c}
		client.Join()
	}
}

func givenServer(handler func(http.ResponseWriter, *http.Request)) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(handler))
}

func givenWebSocketConnection(s *httptest.Server) *websocket.Conn {
	ws, _, _ := websocket.DefaultDialer.Dial(strings.Replace(s.URL, "http", "ws", 1), nil)
	return ws
}

func whenMessageIsSent(ws *websocket.Conn, message string, t *testing.T) {
	if err := ws.WriteMessage(websocket.TextMessage, []byte(message)); err != nil {
		t.Fatalf("%v", err)
	}
}

func whenMessageIsRead(ws *websocket.Conn, t *testing.T) string {
	_, p, err := ws.ReadMessage()
	if err != nil {
		t.Fatalf("%v", err)
	}
	return string(p)
}

func TestConnect(t *testing.T) {
	hub := givenHub()
	handler := givenHandler(hub)
	s := givenServer(handler)
	ws := givenWebSocketConnection(s)

	for i := 0; i < 10; i++ {
		message := fmt.Sprintf("hello %d", i)
		expectedMessage := fmt.Sprintf("{\"data\":\"%v\",\"type\":\"MESSAGE\"}\n", message)

		whenMessageIsSent(ws, message, t)

		receivedMessage := whenMessageIsRead(ws, t)

		if receivedMessage != expectedMessage {
			t.Fatalf("bad message %v", receivedMessage)
		}
	}
}
