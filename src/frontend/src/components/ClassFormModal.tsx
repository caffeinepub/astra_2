import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { BookOpen, Clock, Loader2, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { type Class, DaysOfWeek } from "../backend.d";
import { bigintToHHMM, hhmmToBigint } from "../utils/crypto";

const DAYS = [
  { value: DaysOfWeek.monday, label: "Mon" },
  { value: DaysOfWeek.tuesday, label: "Tue" },
  { value: DaysOfWeek.wednesday, label: "Wed" },
  { value: DaysOfWeek.thursday, label: "Thu" },
  { value: DaysOfWeek.friday, label: "Fri" },
  { value: DaysOfWeek.saturday, label: "Sat" },
  { value: DaysOfWeek.sunday, label: "Sun" },
];

interface ClassFormData {
  name: string;
  subject: string;
  latitude: string;
  longitude: string;
  radiusMeters: string;
  startTime: string;
  endTime: string;
  daysOfWeek: DaysOfWeek[];
  isActive: boolean;
}

interface ClassFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ClassFormData) => Promise<void>;
  editClass?: Class | null;
  isLoading?: boolean;
}

const defaultForm: ClassFormData = {
  name: "",
  subject: "",
  latitude: "",
  longitude: "",
  radiusMeters: "50",
  startTime: "09:00",
  endTime: "10:00",
  daysOfWeek: [DaysOfWeek.monday, DaysOfWeek.wednesday, DaysOfWeek.friday],
  isActive: true,
};

export default function ClassFormModal({
  open,
  onClose,
  onSubmit,
  editClass,
  isLoading,
}: ClassFormModalProps) {
  const [form, setForm] = useState<ClassFormData>(defaultForm);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run when open changes
  useEffect(() => {
    if (editClass) {
      setForm({
        name: editClass.name,
        subject: editClass.subject,
        latitude: editClass.gps.latitude.toString(),
        longitude: editClass.gps.longitude.toString(),
        radiusMeters: editClass.gps.radiusMeters.toString(),
        startTime: bigintToHHMM(editClass.timeSlot.startTime),
        endTime: bigintToHHMM(editClass.timeSlot.endTime),
        daysOfWeek: editClass.timeSlot.daysOfWeek,
        isActive: editClass.isActive,
      });
    } else {
      setForm(defaultForm);
    }
  }, [editClass, open]);

  const toggleDay = (day: DaysOfWeek) => {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {editClass ? "Edit Class" : "Create New Class"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Class Details */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Class Name
              </Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
                placeholder="e.g. CS301-A"
                className="bg-secondary/50 border-border h-9"
                required
              />
            </div>
            <div className="space-y-1 col-span-2 sm:col-span-1">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Subject
              </Label>
              <Input
                value={form.subject}
                onChange={(e) =>
                  setForm((p) => ({ ...p, subject: e.target.value }))
                }
                placeholder="e.g. Data Structures"
                className="bg-secondary/50 border-border h-9"
                required
              />
            </div>
          </div>

          {/* GPS Location */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-primary" /> Classroom GPS Location
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  Latitude
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={form.latitude}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, latitude: e.target.value }))
                  }
                  placeholder="28.6139"
                  className="bg-secondary/50 border-border h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  Longitude
                </Label>
                <Input
                  type="number"
                  step="any"
                  value={form.longitude}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, longitude: e.target.value }))
                  }
                  placeholder="77.2090"
                  className="bg-secondary/50 border-border h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  Radius (m)
                </Label>
                <Input
                  type="number"
                  value={form.radiusMeters}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, radiusMeters: e.target.value }))
                  }
                  placeholder="50"
                  className="bg-secondary/50 border-border h-9 text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Time Slot */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-primary" /> Time Slot
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  Start Time
                </Label>
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, startTime: e.target.value }))
                  }
                  className="bg-secondary/50 border-border h-9 text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-muted-foreground">
                  End Time
                </Label>
                <Input
                  type="time"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, endTime: e.target.value }))
                  }
                  className="bg-secondary/50 border-border h-9 text-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Days of Week */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Days of Week
            </Label>
            <div className="flex flex-wrap gap-2">
              {DAYS.map(({ value, label }) => (
                <div key={value} className="flex items-center gap-1.5">
                  <Checkbox
                    id={`day-${value}`}
                    checked={form.daysOfWeek.includes(value)}
                    onCheckedChange={() => toggleDay(value)}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                  <Label
                    htmlFor={`day-${value}`}
                    className="text-xs font-medium cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between py-2 border-t border-border">
            <div>
              <p className="text-sm font-medium">Active Status</p>
              <p className="text-xs text-muted-foreground">
                Students can enroll in active classes
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-primary text-primary-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : editClass ? (
                "Update Class"
              ) : (
                "Create Class"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type { ClassFormData };
