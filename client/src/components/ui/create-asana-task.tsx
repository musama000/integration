
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
      const asanaToken = tokens.find(t => t.provider === "asana");

      if (!asanaToken) {
        toast({
          title: "Error",
          description: "Please connect your Asana account first",
          variant: "destructive"
        });
        return;
      }

      const client = asana.Client.create({defaultHeaders: {'asana-enable': 'new_project_templates,new_user_task_lists'}}).useAccessToken(asanaToken.accessToken);

      // First get the workspace
      const workspaces = await client.workspaces.getWorkspaces();
      if (!workspaces.data.length) {
        throw new Error("No workspaces found");
      }
      const workspaceId = workspaces.data[0].gid;

      // Then create the task
      const result = await client.tasks.createTask({
        name: "New Task from Integration",
        notes: "This task was created via the integration",
        workspace: workspaceId,
        assignee: "me"
      });

      toast({
        title: "Success",
        description: "Task created in Asana"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button onClick={createTask} disabled={isLoading}>
      {isLoading ? "Creating..." : "Create Asana Task"}
    </Button>
  );
}
