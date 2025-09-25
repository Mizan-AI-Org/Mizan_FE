import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare,
  Send,
  Lightbulb,
  TrendingUp,
  Clock,
  Zap
} from "lucide-react";

const quickQuestions = [
  "What should I order for tomorrow?",
  "Who should I schedule for Saturday night?", 
  "What's my food waste trend this week?",
  "How can I reduce labor costs?",
  "What ingredients expire soon?",
  "Suggest prep tasks for tomorrow"
];

const chatHistory = [
  {
    id: 1,
    type: "user",
    message: "What should I order for tomorrow?",
    time: "10:30 AM"
  },
  {
    id: 2,
    type: "assistant",
    message: "Based on weather forecast (sunny, 75°F) and historical data, I recommend ordering:\n\n• 55 lbs Chicken Breast - 23% increase expected\n• 42 lbs Roma Tomatoes - Critical stock level\n• 25 lbs Lettuce - Salad demand will spike\n• 15 lbs Mozzarella - Pizza Friday prep\n\nTotal estimated cost: $436.75\nExpected ROI: 240%",
    time: "10:30 AM",
    actions: ["Order Now", "Modify Quantities", "Save for Later"]
  },
  {
    id: 3,
    type: "user", 
    message: "Who should I schedule for Saturday night?",
    time: "10:32 AM"
  },
  {
    id: 4,
    type: "assistant",
    message: "For Saturday night (Jan 13), I recommend:\n\n🔥 **Kitchen Staff:**\n• Maria Rodriguez (Head Chef) - 4pm-12am\n• James Wilson (Sous Chef) - 3pm-11pm\n• Mike Thompson (Prep) - 2pm-10pm\n\n👥 **Front of House:**\n• Sarah Kim (Server) - 5pm-close\n• Lisa Chen (Server) - 5pm-close\n• David Park (Host) - 4pm-10pm\n\nPredicted covers: 180 (+35% vs avg Saturday)\nReason: Local concert ends at 9pm",
    time: "10:33 AM",
    actions: ["Schedule All", "Modify Shifts", "Add Backup Staff"]
  }
];

const insights = [
  {
    icon: TrendingUp,
    title: "Revenue Opportunity",
    description: "Add weekend brunch menu - potential $1,200/week increase",
    priority: "high"
  },
  {
    icon: Lightbulb, 
    title: "Cost Savings",
    description: "Bulk order olive oil - save $45/month with current usage",
    priority: "medium"
  },
  {
    icon: Clock,
    title: "Efficiency Boost", 
    description: "Pre-prep salads during slow hours - reduce dinner rush time",
    priority: "medium"
  }
];

export default function AIAssistant() {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    // Simulate AI processing
    setTimeout(() => {
      setIsLoading(false);
      setMessage("");
    }, 2000);
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
                {chatHistory.map(chat => (
                  <div key={chat.id} className={`flex ${chat.type === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-lg p-4 ${
                      chat.type === "user" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-secondary"
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">{chat.message}</div>
                      <div className="text-xs opacity-70 mt-2">{chat.time}</div>
                      
                      {chat.actions && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {chat.actions.map(action => (
                            <Button key={action} size="sm" variant="outline" className="text-xs">
                              {action}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-secondary rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                        <span className="text-sm text-muted-foreground ml-2">AI is thinking...</span>
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
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleSendMessage}
                  disabled={isLoading || !message.trim()}
                  className="bg-gradient-primary hover:bg-primary/90"
                >
                  <Send className="w-4 h-4" />
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
              <CardTitle>Usage Today</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Questions Asked</span>
                <span className="font-semibold">24</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Orders Generated</span>
                <span className="font-semibold">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Schedules Created</span>
                <span className="font-semibold">2</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Insights Provided</span>
                <span className="font-semibold">12</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}