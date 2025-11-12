import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/use-auth";
import { AuthContextType } from "../contexts/AuthContext.types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Send,
  Loader2,
  MessageSquare,
  Lightbulb,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Clock,
  Zap,
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_REACT_APP_API_URL || "http://localhost:8000/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Insight {
  type: "SUCCESS" | "WARNING" | "INFO";
  title: string;
  message: string;
  priority: "LOW" | "MEDIUM" | "HIGH";
  recommendation?: string;
}

interface Tip {
  area: string;
  tip: string;
  potential_savings: string;
  difficulty: string;
}

interface TaskSuggestion {
  title: string;
  priority: string;
  category: string;
}

interface SchedulingRecommendation {
  day: string;
  type: string;
  message: string;
  action: string;
}

const quickQuestions = [
  {
    icon: TrendingUp,
    text: "Revenue insights",
    color: "bg-blue-100 text-blue-700",
    query: "What are my current revenue trends?",
  },
  {
    icon: Users,
    text: "Staff optimization",
    color: "bg-purple-100 text-purple-700",
    query: "How can I optimize my staff scheduling?",
  },
  {
    icon: DollarSign,
    text: "Cost reduction",
    color: "bg-green-100 text-green-700",
    query: "How can I reduce operating costs?",
  },
  {
    icon: Package,
    text: "Inventory tips",
    color: "bg-orange-100 text-orange-700",
    query: "What's the status of my inventory?",
  },
];

export default function EnhancedAIAssistant() {
  const { user } = useAuth() as AuthContextType;
  const [activeTab, setActiveTab] = useState("chat");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [tips, setTips] = useState<Tip[]>([]);
  const [taskSuggestions, setTaskSuggestions] = useState<TaskSuggestion[]>([]);
  const [schedulingRecommendations, setSchedulingRecommendations] = useState<
    SchedulingRecommendation[]
  >([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [insightsRes, tipsRes, tasksRes, schedulingRes] = await Promise.all(
        [
          fetch(`${API_BASE}/assistant/insights/`, { headers }),
          fetch(`${API_BASE}/assistant/cost_optimization/`, { headers }),
          fetch(`${API_BASE}/assistant/task_suggestions/`, { headers }),
          fetch(`${API_BASE}/assistant/scheduling_recommendations/`, {
            headers,
          }),
        ]
      );

      if (insightsRes.ok) setInsights(await insightsRes.json());
      if (tipsRes.ok) {
        const data = await tipsRes.json();
        setTips(data.tips || []);
      }
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTaskSuggestions(data.suggestions || []);
      }
      if (schedulingRes.ok) {
        const data = await schedulingRes.json();
        setSchedulingRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };

    setChatHistory((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE}/assistant/ask_question/`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: userMessage.content,
          context: "general",
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.answer,
        timestamp: new Date(),
      };

      setChatHistory((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      toast.error(error.message || "Failed to get response from AI");
      // Remove the last user message on error
      setChatHistory((prev) => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (query: string) => {
    setMessage(query);
    setTimeout(() => {
      const btn = document.getElementById("send-btn") as HTMLButtonElement;
      if (btn) btn.click();
    }, 0);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Zap className="w-8 h-8 text-yellow-500" />
          AI Assistant
        </h1>
        <p className="text-gray-600 mt-2">
          Get intelligent insights and recommendations for your restaurant
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            <span className="hidden sm:inline">Insights</span>
          </TabsTrigger>
          <TabsTrigger value="tips" className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Tips</span>
          </TabsTrigger>
          <TabsTrigger
            value="recommendations"
            className="flex items-center gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Recommendations</span>
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat">
          <Card>
            <CardHeader>
              <CardTitle>Chat with AI</CardTitle>
              <CardDescription>
                Ask any question about your restaurant
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Chat Messages */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-4 h-96 overflow-y-auto mb-4">
                {chatHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageSquare className="w-12 h-12 text-gray-300 mb-4" />
                    <p className="text-gray-500">
                      Start a conversation with the AI
                    </p>
                  </div>
                ) : (
                  <>
                    {chatHistory.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${
                          msg.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg ${
                            msg.role === "user"
                              ? "bg-blue-500 text-white"
                              : "bg-gray-200 text-gray-800"
                          }`}
                        >
                          <p className="text-sm">{msg.content}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {msg.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Quick Questions */}
              {chatHistory.length === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {quickQuestions.map((q, idx) => {
                    const Icon = q.icon;
                    return (
                      <Button
                        key={idx}
                        variant="outline"
                        onClick={() => handleQuickQuestion(q.query)}
                        className={`justify-start ${q.color}`}
                      >
                        <Icon className="w-4 h-4 mr-2" />
                        {q.text}
                      </Button>
                    );
                  })}
                </div>
              )}

              {/* Message Input */}
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                />
                <Button
                  id="send-btn"
                  onClick={handleSendMessage}
                  disabled={isLoading || !message.trim()}
                  size="icon"
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
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights">
          <div className="space-y-4">
            {insights.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500">
                    No insights available yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              insights.map((insight, idx) => (
                <Card
                  key={idx}
                  className={`border-l-4 ${
                    insight.type === "SUCCESS"
                      ? "border-l-green-500"
                      : insight.type === "WARNING"
                      ? "border-l-yellow-500"
                      : "border-l-blue-500"
                  }`}
                >
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      {insight.type === "SUCCESS" && (
                        <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0" />
                      )}
                      {insight.type === "WARNING" && (
                        <AlertCircle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                      )}
                      {insight.type === "INFO" && (
                        <Lightbulb className="w-6 h-6 text-blue-500 flex-shrink-0" />
                      )}

                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {insight.title}
                          </h3>
                          <Badge
                            variant={
                              insight.priority === "HIGH"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className="text-gray-700 mb-2">{insight.message}</p>
                        {insight.recommendation && (
                          <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                            <strong>Recommendation:</strong>{" "}
                            {insight.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Cost Optimization Tips Tab */}
        <TabsContent value="tips">
          <div className="space-y-4">
            {tips.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-500">
                    No tips available yet
                  </p>
                </CardContent>
              </Card>
            ) : (
              tips.map((tip, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6">
                    <div className="flex gap-4">
                      <DollarSign className="w-6 h-6 text-green-500 flex-shrink-0" />

                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">
                          {tip.area}
                        </h3>
                        <p className="text-gray-700 mb-3">{tip.tip}</p>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-green-50 p-3 rounded">
                            <p className="text-xs text-gray-600">
                              Potential Savings
                            </p>
                            <p className="font-bold text-green-600">
                              {tip.potential_savings}
                            </p>
                          </div>
                          <div className="bg-blue-50 p-3 rounded">
                            <p className="text-xs text-gray-600">Difficulty</p>
                            <p className="font-bold text-blue-600">
                              {tip.difficulty}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations">
          <div className="space-y-4">
            {/* Task Suggestions */}
            {taskSuggestions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Daily Task Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {taskSuggestions.map((task, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded"
                      >
                        <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold">{task.title}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">{task.priority}</Badge>
                            <Badge variant="secondary">{task.category}</Badge>
                          </div>
                        </div>
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scheduling Recommendations */}
            {schedulingRecommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Scheduling Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {schedulingRecommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded"
                      >
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-semibold">{rec.day}</p>
                          <p className="text-sm text-gray-700">{rec.message}</p>
                          <p className="text-sm text-blue-600 mt-1">
                            → {rec.action}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
