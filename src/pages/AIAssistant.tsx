import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  MessageSquare,
  Send,
  Lightbulb,
  TrendingUp,
  Clock,
  Zap,
  Loader2
} from "lucide-react";

const quickQuestions = [
  "What should I order for tomorrow based on weather and demand?",
  "Who should I schedule for this weekend?", 
  "What's my food waste trend this week?",
  "How can I reduce labor costs?",
  "What ingredients are expiring soon?",
  "Suggest prep tasks for tomorrow"
];

const insights = [
  {
    icon: TrendingUp,
    title: "Revenue Opportunity",
    description: "Add weekend brunch menu - potential increase in revenue",
    priority: "high"
  },
  {
    icon: Lightbulb, 
    title: "Cost Savings",
    description: "Bulk order frequently used items to save on costs",
    priority: "medium"
  },
  {
    icon: Clock,
    title: "Efficiency Boost", 
    description: "Pre-prep during slow hours to reduce rush time",
    priority: "medium"
  }
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AIAssistant() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant-chat", {
        body: {
          messages: [
            ...chatHistory.map(m => ({ role: m.role, content: m.content })),
            { role: "user", content: message }
          ],
        },
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      setChatHistory(prev => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error:", error);
      
      if (error.message?.includes("429")) {
        toast.error("Rate limit exceeded. Please wait a moment before trying again.");
      } else if (error.message?.includes("402")) {
        toast.error("AI credits exhausted. Please add credits to your workspace.");
      } else {
        toast.error("Failed to get AI response. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setMessage(question);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Assistant</h1>
          <p className="text-muted-foreground">Get instant insights and recommendations for your restaurant</p>
        </div>
        <Badge className="bg-gradient-primary text-white">
          <Zap className="w-3 h-3 mr-1" />
          AI Powered
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat Interface */}
        <div className="lg:col-span-2">
          <Card className="shadow-soft h-[600px] flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Chat with Mizan AI
              </CardTitle>
              <CardDescription>Ask questions about operations, get actionable insights</CardDescription>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col">
              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                {chatHistory.length === 0 && (
                  <div className="text-center text-muted-foreground py-12">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Start a conversation with Mizan AI</p>
                    <p className="text-sm">Try one of the quick questions below</p>
                  </div>
                )}
                
                {chatHistory.map(chat => (
                  <div key={chat.id} className={`flex ${chat.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg p-4 ${
                      chat.role === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary"
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">{chat.content}</div>
                      <div className="text-xs opacity-70 mt-2">
                        {chat.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">AI is thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex space-x-2">
                <Input
                  placeholder="Ask about inventory, staffing, sales trends..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !isLoading && handleSendMessage()}
                  className="flex-1"
                  disabled={isLoading}
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isLoading || !message.trim()}
                  className="bg-gradient-primary hover:bg-primary/90"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Questions */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Quick Questions</CardTitle>
              <CardDescription>Common queries to get you started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickQuestions.map((question, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => handleQuickQuestion(question)}
                  disabled={isLoading}
                >
                  <span className="text-sm">{question}</span>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* AI Insights */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>AI Insights</CardTitle>
              <CardDescription>Proactive recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {insights.map((insight, index) => (
                <div key={index} className="p-3 bg-secondary rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      insight.priority === "high" ? "bg-destructive/10" : "bg-primary/10"
                    }`}>
                      <insight.icon className={`w-4 h-4 ${
                        insight.priority === "high" ? "text-destructive" : "text-primary"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-sm">{insight.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                      <Badge 
                        variant={insight.priority === "high" ? "destructive" : "secondary"}
                        className="mt-2 text-xs"
                      >
                        {insight.priority}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Usage Stats */}
          <Card className="shadow-soft">
            <CardHeader>
              <CardTitle>Session Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Questions Asked</span>
                <span className="font-semibold">{chatHistory.filter(m => m.role === "user").length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">AI Responses</span>
                <span className="font-semibold">{chatHistory.filter(m => m.role === "assistant").length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
