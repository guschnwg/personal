package app

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

func BindSocket(r *mux.Router) {
	hub := Hub{
		upgrader: websocket.Upgrader{},
		clients:  make(map[*Client]bool),
		rooms:    make(map[string]Clients),
	}

	r.HandleFunc("/socket", func(w http.ResponseWriter, r *http.Request) {
		c, err := hub.upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Print("upgrade:", err)
			return
		}
		defer c.Close()

		client := &Client{&hub, c}
		client.Join()
	})
}

type Message map[string]interface{}
type Clients map[*Client]bool

type Client struct {
	hub  *Hub
	conn *websocket.Conn
}

type Hub struct {
	upgrader websocket.Upgrader
	clients  Clients
	rooms    map[string]Clients
}

func (c *Client) Join() {
	c.hub.clients[c] = true

	c.conn.SetCloseHandler(func(code int, text string) error {
		delete(c.hub.clients, c)
		return nil
	})

	c.Listen()
}

func (c *Client) Listen() {
	for {
		messageType, rawMessage, err := c.conn.ReadMessage()
		if err != nil {
			log.Println("read:", err)
			break
		}

		if messageType != websocket.TextMessage {
			continue
		}

		message := Message{}
		err = json.Unmarshal(rawMessage, &message)
		if err != nil {
			message["type"] = "MESSAGE"
			message["data"] = string(rawMessage)
		}

		if c.RoomMessageHandled(message) {
			continue
		}

		for client := range c.hub.clients {
			err = client.conn.WriteJSON(message)
			if err != nil {
				log.Println("write:", err)
				break
			}
		}
	}
}

func (c *Client) RoomMessageHandled(message Message) bool {
	if msgType, ok := message["type"]; ok {
		if msgType == "JOIN" || msgType == "LEAVE" {
			if msgRoom, ok := message["room"]; ok {
				room := msgRoom.(string)
				if _, ok := c.hub.rooms[room]; !ok {
					c.hub.rooms[room] = make(Clients)
				}

				if msgType == "JOIN" {
					c.hub.rooms[room][c] = true
				} else if msgType == "LEAVE" {
					delete(c.hub.rooms[room], c)
				}
			}
			return true
		} else if msgType == "ROOM" {
			if msgRoom, ok := message["room"]; ok {
				if room, ok := c.hub.rooms[msgRoom.(string)]; ok {
					if _, ok := room[c]; !ok {
						return true
					}

					for client := range room {
						client.conn.WriteJSON(Message{
							"type": "MESSAGE",
							"room": msgRoom.(string),
							"data": message["data"],
						})
					}
				}
			}
			return true
		}
	}

	return false
}
