import { Property } from "@/lib/types";
import { X, MapPin, Phone, Mail, Building, Calendar, AlertTriangle, CheckCircle, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DetailPanelProps {
  property: Property | null;
  onClose: () => void;
}

const InfoRow = ({ icon: Icon, label, value, accent = false }: { icon: any; label: string; value?: string | null; accent?: boolean }) => {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className={`w-3.5 h-3.5 mt-0.5 ${accent ? 'text-primary' : 'text-muted-foreground'}`} />
      <div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">{label}</span>
        <span className="text-xs text-foreground">{value}</span>
      </div>
    </div>
  );
};

const PhoneRow = ({ phone, type, wrong, lastSeen, index }: { phone?: string; type?: string; wrong?: boolean; lastSeen?: string; index: number }) => {
  if (!phone) return null;
  const formatted = phone.length === 10 ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}` : phone;
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/20">
      <div className="flex items-center gap-2">
        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
        <div>
          <span className="text-xs font-mono text-foreground">{formatted}</span>
          {type && <span className="text-[10px] text-muted-foreground ml-2">{type}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {wrong === true && (
          <span className="inline-flex items-center gap-0.5 text-[10px] text-primary">
            <AlertTriangle className="w-3 h-3" /> Wrong
          </span>
        )}
        {wrong === false && (
          <CheckCircle className="w-3 h-3 text-success" />
        )}
      </div>
    </div>
  );
};

const DetailPanel = ({ property, onClose }: DetailPanelProps) => {
  if (!property) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-[380px] bg-card border-l border-border shadow-2xl z-50 animate-slide-in flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {property.first_name} {property.last_name}
          </h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Property #{property.id}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 hover:!bg-primary/5 hover:!text-primary">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-5 space-y-5">
          {/* Client */}
          <div>
            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary bg-primary/5">
              {property.client_name}
            </Badge>
          </div>

          {/* Property Address */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Property Address</h3>
            <div className="bg-muted/20 rounded-lg p-3 space-y-0.5">
              <InfoRow icon={MapPin} label="Address" value={property.address} accent />
              <InfoRow icon={Building} label="City" value={property.city} />
              <div className="flex gap-6">
                <InfoRow icon={MapPin} label="State" value={property.state} />
                <InfoRow icon={MapPin} label="Zip" value={property.zipcode} />
              </div>
            </div>
          </div>

          {/* Mailing Address */}
          {property.mailing_address && (
            <div>
              <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Mailing Address</h3>
              <div className="bg-muted/20 rounded-lg p-3 space-y-0.5">
                <InfoRow icon={Mail} label="Address" value={property.mailing_address} />
                <InfoRow icon={Building} label="City" value={property.mailing_city} />
                <div className="flex gap-6">
                  <InfoRow icon={MapPin} label="State" value={property.mailing_state} />
                  <InfoRow icon={MapPin} label="Zip" value={property.mailing_zip} />
                </div>
              </div>
            </div>
          )}

          <Separator className="bg-border" />

          {/* Phone Numbers */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Phone Numbers</h3>
            <div className="space-y-1">
              <PhoneRow phone={property.phone_1} type={property.type_1} wrong={property.wrong_1} lastSeen={property.last_seen_1} index={1} />
              <PhoneRow phone={property.phone_2} type={property.type_2} wrong={property.wrong_2} lastSeen={property.last_seen_2} index={2} />
              <PhoneRow phone={property.phone_3} type={property.type_3} wrong={property.wrong_3} lastSeen={property.last_seen_3} index={3} />
              {!property.phone_1 && !property.phone_2 && !property.phone_3 && (
                <p className="text-xs text-muted-foreground italic">No phone numbers on file</p>
              )}
            </div>
          </div>

          <Separator className="bg-border" />

          {/* Emails */}
          <div>
            <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Email Addresses</h3>
            <div className="space-y-1.5">
              {[property.email_1, property.email_2, property.email_3].filter(Boolean).map((email, i) => (
                <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-muted/20">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-foreground">{email}</span>
                </div>
              ))}
              {!property.email_1 && !property.email_2 && !property.email_3 && (
                <p className="text-xs text-muted-foreground italic">No emails on file</p>
              )}
            </div>
          </div>

          {/* Last Seen */}
          {(property.last_seen_1 || property.last_seen_2 || property.last_seen_3) && (
            <>
              <Separator className="bg-border" />
              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Last Seen</h3>
                <div className="space-y-1">
                  {[property.last_seen_1, property.last_seen_2, property.last_seen_3].map((date, i) => date ? (
                    <div key={i} className="flex items-center gap-2 py-1">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Phone {i + 1}:</span>
                      <span className="text-xs text-foreground">{date}</span>
                    </div>
                  ) : null)}
                </div>
              </div>
            </>
          )}

          {/* Date Added */}
          {property.created_at && (
            <>
              <Separator className="bg-border" />
              <InfoRow icon={Calendar} label="Date Added" value={property.created_at} />
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DetailPanel;
