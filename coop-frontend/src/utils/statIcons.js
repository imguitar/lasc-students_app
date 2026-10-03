import { createElement } from 'react';
import {
  Users,
  Hourglass,
  CheckCircle2,
  XCircle,
  FileText,
  ClipboardCheck,
  CalendarDays,
  StickyNote,
  Briefcase,
  BadgeCheck,
} from 'lucide-react';

const iconProps = { size: 20, strokeWidth: 2.2 };

export const STAT_ICON = {
  TOTAL: createElement(Users, iconProps),
  PENDING: createElement(Hourglass, iconProps),
  APPROVED: createElement(CheckCircle2, iconProps),
  REJECTED: createElement(XCircle, iconProps),
  DOCUMENT: createElement(FileText, iconProps),
  STATUS: createElement(ClipboardCheck, iconProps),
  CALENDAR: createElement(CalendarDays, iconProps),
  NOTE: createElement(StickyNote, iconProps),
  INTERNING: createElement(Briefcase, iconProps),
  COMPLETED: createElement(BadgeCheck, iconProps),
};
