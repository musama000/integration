import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Token } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { BsMicrosoftTeams } from "react-icons/bs"; // Using a Microsoft Teams icon as a placeholder
import { Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import React from 'react';

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useLocation();

  const { data: tokens, isLoading } = useQuery<Token[]>({
    queryKey: ["/api/tokens"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (tokenId: number) => {
      await apiRequest("DELETE", `/api/tokens/${tokenId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tokens"] });
      toast({
        title: "Token removed",
        description: "The integration token has been removed successfully.",
      });
    },
  });

  // Show OAuth result toast
  React.useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (params.get("oauth") === "success") {
      toast({
        title: "Connected successfully",
        description: "Your Monday.com account has been connected.",
      });
    } else if (params.get("oauth") === "error") {
      toast({
        title: "Connection failed",
        description: "Failed to connect your Monday.com account.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Integration Portal</h1>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              Welcome, {user?.username}
            </span>
            <Button
              variant="outline"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <section>
            <h2 className="text-xl font-semibold mb-4">Available Integrations</h2>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BsMicrosoftTeams className="h-5 w-5" />
                  Monday.com
                </CardTitle>
                <CardDescription>
                  Connect your Monday.com workspace to manage boards and items
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  asChild
                  className="w-full sm:w-auto"
                >
                  <a href="/api/oauth/monday">Connect Monday.com</a>
                </Button>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4">Active Integrations</h2>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : tokens?.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  No active integrations. Connect an integration above to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {tokens?.map((token) => (
                  <Card key={token.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {token.provider === "monday" && (
                            <BsMicrosoftTeams className="h-5 w-5" />
                          )}
                          <CardTitle className="capitalize">
                            {token.provider}
                          </CardTitle>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove Integration
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this integration?
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(token.id)}
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <span className="text-sm font-medium">
                            Access Token:
                          </span>
                          <code className="ml-2 p-1 bg-muted rounded text-sm">
                            {token.accessToken.slice(0, 20)}...
                          </code>
                        </div>
                        {token.expiresAt && (
                          <div>
                            <span className="text-sm font-medium">
                              Expires At:
                            </span>
                            <span className="ml-2 text-sm text-muted-foreground">
                              {new Date(token.expiresAt).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}