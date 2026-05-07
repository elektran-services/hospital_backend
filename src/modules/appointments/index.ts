export type AppointmentType = "virtual" | "physical";
export type AppointmentStatus = "requested" | "confirmed" | "completed" | "cancelled";

export interface AppointmentCreateInput {
  hospital_id: string;
  branch_id: string;
  doctor_id: string;
  patient_id: string;
  scheduled_at: Date;
  appointment_type: AppointmentType;
  created_by: string;
}

export class AppointmentService {
  async createAppointment(_input: AppointmentCreateInput) {
    void _input;
    throw new Error("Not implemented");
  }

  async listAppointments(_hospitalId: string, _branchId?: string) {
    void _hospitalId;
    void _branchId;
    throw new Error("Not implemented");
  }
}

