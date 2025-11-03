import React, { useState, useEffect, useRef, FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { parseISO } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE =
  import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";
const WS_BASE =
  import.meta.env.VITE_REACT_APP_WS_URL || "ws://localhost:8000/ws";

interface UserInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Message {
  id: string;
  sender: string;
  sender_info: UserInfo;
  recipient: string | null;
  recipient_info: UserInfo | null;
  room_name: string | null;
  content: string;
  timestamp: string;
  is_read: boolean;
}

const StaffChat: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messageInput, setMessageInput] = useState<string>("");
  const ws = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch historical messages
  const {
    data: messages = [],
    isLoading,
    error,
  } = useQuery<Message[]>({
    queryKey: ["chatMessages", user?.restaurant?.id],
    queryFn: async () => {
      if (!user?.restaurant?.id) return [];
      const response = await fetch(
        `${API_BASE}/chat/messages/?room_name=chat_${user.restaurant.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error("Failed to fetch chat messages");
      }
      return response.json();
    },
    enabled: !!user?.restaurant?.id,
  });

  useEffect(() => {
    if (!user) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
      ws.current = new WebSocket(
        `${WS_BASE}/ws/chat/?token=${localStorage.getItem("access_token")}`
      );

      ws.current.onopen = () => {
        console.log("Chat WebSocket Connected");
      };

      ws.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "chat_message") {
          queryClient.setQueryData<Message[]>(
            ["chatMessages", user.restaurant.id],
            (oldMessages) => {
              return oldMessages
                ? [data.message, ...oldMessages]
                : [data.message];
            }
          );
        }
      };

      ws.current.onerror = (error) => {
        console.error("Chat WebSocket Error:", error);
      };

      ws.current.onclose = () => {
        console.log("Chat WebSocket Disconnected");
        // Attempt to reconnect after a delay
        setTimeout(() => {
          if (user && ws.current?.readyState === WebSocket.CLOSED) {
            ws.current = null;
            // Optionally re-fetch messages or just try to reconnect WebSocket
            queryClient.invalidateQueries({
              queryKey: ["chatMessages", user.restaurant.id],
            });
          }
        }, 3000);
      };
    }

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [user, queryClient]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (
      messageInput.trim() === "" ||
      !ws.current ||
      ws.current.readyState !== WebSocket.OPEN
    )
      return;

    const messageData = {
      message: messageInput,
      // recipient_id: 'some_user_id', // For direct messages
    };
    ws.current.send(JSON.stringify(messageData));
    setMessageInput("");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2 text-gray-600">Loading messages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Error: {error.message}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-8 text-gray-500">
        Please log in to view chat.
      </div>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-blue-500" /> Staff Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-hidden">
        <ScrollArea className="h-full w-full pr-4">
          <div className="space-y-4">
            {[...messages].reverse().map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === user.id ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex flex-col p-3 rounded-lg max-w-[70%] ${
                    msg.sender === user.id
                      ? "bg-blue-500 text-white rounded-br-none"
                      : "bg-gray-200 text-gray-800 rounded-bl-none"
                  }`}
                >
                  <span className="text-xs font-semibold mb-1">
                    {msg.sender === user.id
                      ? "You"
                      : msg.sender_info.first_name}
                  </span>
                  <p className="text-sm">{msg.content}</p>
                  <span className="text-xs opacity-75 mt-1 self-end">
                    {format(parseISO(msg.timestamp), "hh:mm a")}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="border-t p-4">
        <form onSubmit={sendMessage} className="flex w-full space-x-2">
          <Input
            placeholder="Type your message..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={
              !ws.current ||
              ws.current.readyState !== WebSocket.OPEN ||
              messageInput.trim() === ""
            }
          >
            <Send className="h-4 w-4 mr-2" /> Send
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
};

export default StaffChat;
