"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, XCircle, AlertTriangle, Info, RefreshCw, ExternalLink, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useProjects } from "@/lib/hooks/use-projects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@clerk/nextjs";

export default function WasabiAdminPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  const router = useRouter();
  const { projects, isLoading: isLoadingProjects } = useProjects();
  const { userId } = useAuth();
  
  // Check if user is admin (this should be replaced with your actual admin verification)
  useEffect(() => {
    const checkAdmin = async () => {
      // In a real app, you would check against a list of admin user IDs 
      // or call an API to verify admin status
      // For demo purposes, you could add a list of admin IDs in environment variables
      const adminIds = process.env.NEXT_PUBLIC_ADMIN_USER_IDS?.split(',') || [];
      const isUserAdmin = userId && adminIds.includes(userId);
      
      setIsAdmin(isUserAdmin || process.env.NODE_ENV === 'development');
      
      if (!isUserAdmin && process.env.NODE_ENV !== 'development') {
        // Redirect non-admin users
        router.push('/');
      }
    };
    
    checkAdmin();
  }, [userId, router]);

  const verifyConfiguration = async () => {
    setStatus("loading");
    setErrorMessage(null);
    setConfigStatus(null);
    
    try {
      const response = await fetch("/api/wasabi/verify", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      console.log("Verify response:", data);
      
      if (response.ok && data.success) {
        setStatus("success");
        setConfigStatus(data.status || {});
      } else {
        setStatus("error");
        setErrorMessage(data.message || "Failed to verify Wasabi configuration");
        setConfigStatus(data.status || {});
      }
    } catch (error) {
      console.error("Error verifying Wasabi configuration:", error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : "An unexpected error occurred while verifying Wasabi configuration"
      );
    }
  };
  
  const migrateFiles = async () => {
    if (!selectedProjectId) {
      setErrorMessage("Please select a project first");
      return;
    }
    
    setStatus("loading");
    setErrorMessage(null);
    setMigrationStatus(null);
    
    try {
      const response = await fetch("/api/wasabi/migrate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ projectId: selectedProjectId }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStatus("success");
        setMigrationStatus(data);
      } else {
        setStatus("error");
        setErrorMessage(data.message || "Failed to migrate files to Wasabi");
        setMigrationStatus(data);
      }
    } catch (error) {
      console.error("Error migrating files to Wasabi:", error);
      setStatus("error");
      setErrorMessage(
        error instanceof Error 
          ? error.message 
          : "An unexpected error occurred during migration"
      );
    }
  };

  // Helper function to render configuration status
  const renderConfigStatus = () => {
    if (!configStatus) return null;

    const statusItems = [];
    
    // Check for missing env vars
    if (configStatus.hasMissingEnvVars) {
      statusItems.push({
        key: "missing_env_vars",
        label: "Environment Variables",
        value: false,
        details: "Some required environment variables are missing"
      });
    }
    
    // Check for client creation error
    if (configStatus.clientCreationError) {
      statusItems.push({
        key: "client_creation",
        label: "S3 Client Creation",
        value: false,
        details: "Failed to create S3 client"
      });
    }
    
    // Check for bucket access error
    if (configStatus.bucketAccessError) {
      statusItems.push({
        key: "bucket_access",
        label: "Bucket Access",
        value: false,
        details: "Unable to access bucket"
      });
    }
    
    // Success states
    if (configStatus.envVarsPresent) {
      statusItems.push({
        key: "env_vars",
        label: "Environment Variables",
        value: true,
        details: "All required environment variables are present"
      });
    }
    
    if (configStatus.clientCreationSuccess) {
      statusItems.push({
        key: "client_creation",
        label: "S3 Client Creation",
        value: true,
        details: "S3 client created successfully"
      });
    }
    
    if (configStatus.bucketAccessSuccess) {
      statusItems.push({
        key: "bucket_access",
        label: "Bucket Access",
        value: true,
        details: "Bucket is accessible"
      });
    }
    
    return (
      <div className="mt-4 space-y-2">
        <h3 className="text-lg font-medium">Configuration Details</h3>
        <ul className="space-y-2">
          {statusItems.map((item) => (
            <li key={item.key} className="flex items-center">
              {item.value === true ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
              ) : item.value === false ? (
                <XCircle className="h-4 w-4 text-red-500 mr-2" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
              )}
              <div className="flex flex-col">
                <span className="font-medium">{item.label}</span>
                {item.details && <span className="text-xs text-slate-500">{item.details}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  if (!isAdmin && process.env.NODE_ENV !== 'development') {
    return (
      <div className="container mx-auto py-20">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            This page is restricted to administrators only.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-2 mb-4">
        <ShieldAlert className="h-5 w-5 text-amber-500" />
        <h2 className="text-sm font-medium text-amber-500">Administrator Access</h2>
      </div>
      
      <h1 className="text-3xl font-bold mb-8">Storage Management</h1>
      
      <Tabs defaultValue="verify">
        <TabsList className="mb-6">
          <TabsTrigger value="verify">Verify Configuration</TabsTrigger>
          <TabsTrigger value="migrate">Migrate Files</TabsTrigger>
          <TabsTrigger value="help">Setup Help</TabsTrigger>
        </TabsList>
        
        <TabsContent value="verify">
          <Card>
            <CardHeader>
              <CardTitle>Wasabi Configuration Status</CardTitle>
              <CardDescription>
                Verify that your Wasabi S3 storage is properly configured and accessible.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status === "error" && errorMessage && (
                <Alert className="mb-4" variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Configuration Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              
              {status === "success" && (
                <Alert className="mb-4">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Configuration Verified</AlertTitle>
                  <AlertDescription>
                    Your Wasabi storage configuration is working correctly.
                  </AlertDescription>
                </Alert>
              )}
              
              {renderConfigStatus()}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={verifyConfiguration} 
                disabled={status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Info className="mr-2 h-4 w-4" />
                    Verify Configuration
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="migrate">
          <Card>
            <CardHeader>
              <CardTitle>Migrate Files to Wasabi</CardTitle>
              <CardDescription>
                Ensure all your project files are properly stored in Wasabi S3 storage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {status === "error" && errorMessage && (
                <Alert className="mb-4" variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Migration Error</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              
              {status === "success" && migrationStatus && (
                <Alert className="mb-4">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Migration Complete</AlertTitle>
                  <AlertDescription>
                    {migrationStatus.message || "Files were successfully migrated to Wasabi."}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="mb-4">
                <p className="mb-2">Select a project to migrate:</p>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                  disabled={isLoadingProjects || status === "loading"}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects?.map((project: { id: string; name: string }) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {migrationStatus && (
                <div className="mt-4 p-4 bg-slate-50 rounded-md">
                  <h3 className="text-lg font-medium mb-2">Migration Results</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-slate-500">Total Files</p>
                      <p className="text-lg font-medium">{migrationStatus.total || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Migrated Files</p>
                      <p className="text-lg font-medium">{migrationStatus.migrated || 0}</p>
                    </div>
                    {migrationStatus.failed > 0 && (
                      <div>
                        <p className="text-sm text-slate-500">Failed Files</p>
                        <p className="text-lg font-medium text-red-500">{migrationStatus.failed}</p>
                      </div>
                    )}
                  </div>
                  
                  {migrationStatus.results && migrationStatus.results.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Details:</p>
                      <div className="max-h-40 overflow-y-auto text-xs">
                        <table className="min-w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-1">File</th>
                              <th className="text-left py-1">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {migrationStatus.results.map((result: any, index: number) => (
                              <tr key={index} className="border-b">
                                <td className="py-1 truncate max-w-xs">{result.fileName}</td>
                                <td className={`py-1 ${result.status === 'error' ? 'text-red-500' : 'text-green-500'}`}>
                                  {result.status === 'error' ? result.error || 'Failed' : 'Migrated'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={migrateFiles} 
                disabled={!selectedProjectId || status === "loading"}
              >
                {status === "loading" ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Migrating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Migrate Files
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="help">
          <Card>
            <CardHeader>
              <CardTitle>Wasabi Setup for Administrators</CardTitle>
              <CardDescription>
                Configure Wasabi S3 storage for your application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Administrator Only</AlertTitle>
                <AlertDescription>
                  These settings are for application administrators only. End users do not need to configure storage settings.
                </AlertDescription>
              </Alert>

              <div>
                <h3 className="text-lg font-medium mb-2">Environment Variables Setup</h3>
                <p className="text-sm text-slate-600 mb-2">
                  Add the following environment variables to your deployment:
                </p>
                <div className="bg-slate-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                  <pre>
{`# Wasabi S3 Storage Configuration
WASABI_BUCKET_NAME=your-bucket-name
WASABI_REGION=eu-central-2
WASABI_ENDPOINT=https://s3.eu-central-2.wasabisys.com
WASABI_ACCESS_KEY_ID=your-access-key-id
WASABI_SECRET_ACCESS_KEY=your-secret-access-key

# Optional development helpers
USE_PLACEHOLDER_DOWNLOADS=true  # Only in development`}
                  </pre>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  <strong>Note:</strong> The WASABI_ENDPOINT <strong>must</strong> include the full URL with https:// protocol
                </p>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Known Issues</h3>
                <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                  <li>
                    <strong>Invalid URL error</strong>: If you see this error, make sure your WASABI_ENDPOINT
                    includes the https:// prefix (e.g., https://s3.eu-central-2.wasabisys.com).
                  </li>
                  <li>
                    <strong>Access denied</strong>: Ensure your Wasabi access keys have proper permissions
                    and that your bucket policy allows the intended operations.
                  </li>
                  <li>
                    <strong>File migration issues</strong>: If files aren&apos;t migrating correctly,
                    try updating the file records in the database first, then uploading the actual content.
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Frankfurt Region Configuration</h3>
                <p className="text-sm text-slate-600 mb-2">
                  For the Frankfurt region (eu-central-2), ensure these settings are correct:
                </p>
                <div className="bg-slate-100 p-3 rounded-md font-mono text-xs overflow-x-auto">
                  <pre>
{`WASABI_REGION=eu-central-2
WASABI_ENDPOINT=https://s3.eu-central-2.wasabisys.com`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 