import { Button } from "./button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import * as Asana from 'asana';

export function CreateAsanaTask() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const createTask = async () => {
    try {
      setIsLoading(true);

      // Fetch tokens
      const response = await fetch("/api/tokens");
      const tokens = await response.json();
      const asanaToken = tokens.find((t: { provider: string }) => t.provider === "asana");

      if (!asanaToken) {
        toast({
          title: "Error",
          description: "Please connect your Asana account first",
          variant: "destructive"
        });
        return;
      }

      // Initialize Asana client with proper error handling
      let client;
      try {
        client = Asana.Client.create({
          defaultHeaders: {
            'asana-enable': 'new_project_templates,new_user_task_lists'
          }
        });
        client.useAccessToken(asanaToken.accessToken);
      } catch (initError) {
        console.error('Asana client initialization error:', initError);
        toast({
          title: "Error",
          description: "Failed to initialize Asana client. Please try reconnecting your account.",
          variant: "destructive"
        });
        return;
      }

      // Get workspaces with error handling
      let workspaces;
      try {
        workspaces = await client.workspaces.findAll();
      } catch (workspaceError) {
        console.error('Error fetching workspaces:', workspaceError);
        toast({
          title: "Error",
          description: "Could not fetch Asana workspaces. Please check your permissions.",
          variant: "destructive"
        });
        return;
      }

      if (!workspaces.data || !workspaces.data.length) {
        toast({
          title: "Error",
          description: "No Asana workspaces found. Please make sure you have access to at least one workspace.",
          variant: "destructive"
        });
        return;
      }

      const workspaceId = workspaces.data[0].gid;

      // Create task with error handling
      try {
        await client.tasks.create({
          name: "New Task from Integration",
          notes: "This task was created via the integration",
          workspace: workspaceId,
          assignee: "me"
        });

        toast({
          title: "Success",
          description: "Task created in Asana successfully"
        });
      } catch (taskError: any) {
        console.error('Error creating task:', taskError);
        const errorMessage = taskError.value?.errors?.[0]?.message || 
                           "Failed to create task. Please check your permissions and try again.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={createTask} 
      disabled={isLoading}
      className="mt-4"
    >
      {isLoading ? "Creating..." : "Create Test Task"}
    </Button>
  );
}