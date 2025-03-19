import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/header";
import { useAuth } from "@/hooks/use-auth";

export default function TestNotificationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Formulário para teste de notificação
  const [notificationForm, setNotificationForm] = useState({
    userId: user?.id || 1,
    requestId: 1,
    type: "status_update" as "status_update" | "quote_received" | "proof_uploaded",
    message: "Teste de notificação do sistema LogMene",
    sendEmail: false,
    sendWhatsApp: false
  });
  
  // Formulário para teste direto de WhatsApp
  const [whatsappForm, setWhatsappForm] = useState({
    phoneNumber: "+5535999220624",
    message: "Teste de mensagem WhatsApp do sistema LogMene em modo de produção."
  });
  
  // Formulário para teste de email
  const [emailForm, setEmailForm] = useState({
    email: user?.email || "teste@example.com"
  });
  
  const handleNotificationSubmit = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/test/notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationForm)
      });
      
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "Notificação enviada",
          description: data.message,
        });
      } else {
        toast({
          title: "Erro ao enviar notificação",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao testar notificação:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao testar a notificação. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleEmailSubmit = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(`/api/test/brevo-email?email=${encodeURIComponent(emailForm.email)}`);
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "Email enviado",
          description: data.message,
        });
      } else {
        toast({
          title: "Erro ao enviar email",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao testar email:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao testar o email. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFallbackTest = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch(`/api/test/notification-fallback?email=${encodeURIComponent(emailForm.email)}`);
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "Teste de fallback concluído",
          description: data.message,
        });
      } else {
        toast({
          title: "Erro no teste de fallback",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao testar fallback:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao testar o mecanismo de fallback. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleWhatsAppSubmit = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/test/whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(whatsappForm)
      });
      
      const data = await response.json();
      setResult(data);
      
      if (response.ok) {
        toast({
          title: "WhatsApp enviado",
          description: data.message,
        });
      } else {
        toast({
          title: "Erro ao enviar WhatsApp",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao testar WhatsApp:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao testar o envio de WhatsApp. Verifique o console para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto pb-8">
      <Header title="Ferramentas de Teste" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Teste de Notificação */}
        <Card>
          <CardHeader>
            <CardTitle>Teste de Notificação</CardTitle>
            <CardDescription>Enviar uma notificação para um usuário</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ID do Usuário</Label>
              <Input 
                id="userId" 
                type="number" 
                value={notificationForm.userId}
                onChange={(e) => setNotificationForm({
                  ...notificationForm,
                  userId: parseInt(e.target.value)
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="requestId">ID da Solicitação</Label>
              <Input 
                id="requestId" 
                type="number" 
                value={notificationForm.requestId}
                onChange={(e) => setNotificationForm({
                  ...notificationForm,
                  requestId: parseInt(e.target.value)
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select 
                value={notificationForm.type}
                onValueChange={(value: any) => setNotificationForm({
                  ...notificationForm,
                  type: value
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status_update">Atualização de Status</SelectItem>
                  <SelectItem value="quote_received">Cotação Recebida</SelectItem>
                  <SelectItem value="proof_uploaded">Comprovante Enviado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea 
                id="message" 
                value={notificationForm.message}
                onChange={(e) => setNotificationForm({
                  ...notificationForm,
                  message: e.target.value
                })}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="sendEmail" 
                checked={notificationForm.sendEmail}
                onCheckedChange={(checked) => setNotificationForm({
                  ...notificationForm,
                  sendEmail: checked
                })}
              />
              <Label htmlFor="sendEmail">Enviar também por email</Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleNotificationSubmit} 
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar Notificação"}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Teste de Email */}
        <Card>
          <CardHeader>
            <CardTitle>Teste de Email</CardTitle>
            <CardDescription>Enviar um email de teste</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={emailForm.email}
                onChange={(e) => setEmailForm({
                  ...emailForm,
                  email: e.target.value
                })}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              onClick={handleEmailSubmit} 
              disabled={loading}
            >
              {loading ? "Enviando..." : "Enviar Email via Brevo"}
            </Button>
            
            <Button 
              onClick={handleFallbackTest} 
              disabled={loading}
              variant="outline"
            >
              {loading ? "Testando..." : "Testar Fallback"}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Teste de WhatsApp */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Teste de WhatsApp em Produção</CardTitle>
            <CardDescription>
              <span className="text-red-500 font-bold">ATENÇÃO:</span> Enviar uma mensagem real via WhatsApp (Twilio)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Número de Telefone (formato internacional com +)</Label>
              <Input 
                id="phoneNumber" 
                type="text" 
                value={whatsappForm.phoneNumber}
                onChange={(e) => setWhatsappForm({
                  ...whatsappForm,
                  phoneNumber: e.target.value
                })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="whatsappMessage">Mensagem</Label>
              <Textarea 
                id="whatsappMessage" 
                value={whatsappForm.message}
                onChange={(e) => setWhatsappForm({
                  ...whatsappForm,
                  message: e.target.value
                })}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleWhatsAppSubmit} 
              disabled={loading}
              variant="destructive"
              className="w-full"
            >
              {loading ? "Enviando..." : "ENVIAR WHATSAPP EM PRODUÇÃO"}
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Exibir resultado */}
      {result && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Resultado</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}