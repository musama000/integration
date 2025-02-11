import { Button } from "./button";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import asana from 'asana';

export function CreateAsanaTask() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const createTask = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/tokens");
      const tokens = await response.json();
      console.log('Tokens received:', tokens); // Debug log

      const asanaToken = tokens.find((t: { provider: string }) => t.provider === "asana");
      console.log('Asana token:', asanaToken); // Debug log

      if (!asanaToken) {
        toast({
          title: "Error",
          description: "Please connect your Asana account first",
          variant: "destructive"
        });
        return;
      }

      const client = asana.Client.create({
        defaultHeaders: {'asana-enable': 'new_project_templates,new_user_task_lists'}
      }).useAccessToken(asanaToken.accessToken);

      // First get the workspace
      const workspaces = await client.workspaces.getWorkspaces();
      console.log('Workspaces:', workspaces); // Debug log

      if (!workspaces.data.length) {
        throw new Error("No workspaces found");
      }
      const workspaceId = workspaces.data[0].gid;
      console.log('Using workspace:', workspaceId); // Debug log

      // Then create the task
      const result = await client.tasks.create({
        name: "New Task from Integration",
        notes: "This task was created via the integration",
        workspace: workspaceId,
        assignee: "me"
      });
      console.log('Task created:', result); // Debug log

      toast({
        title: "Success",
        description: "Task created in Asana"
      });
    } catch (error: any) {
      console.error('Asana API Error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      }); // More detailed error logging
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
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