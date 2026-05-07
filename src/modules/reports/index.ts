import { db } from "@/lib/db";

/**
 * Report Generation Module
 * Generates various hospital analytics reports with multi-tenant support
 */

// Helper functions for date manipulation
function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface AppointmentMetrics {
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  virtualAppointments: number;
  physicalAppointments: number;
  averageCompletionRate: number;
  completionRateByDoctor: Array<{
    doctorId: string;
    doctorName: string;
    completedCount: number;
    totalCount: number;
    completionRate: number;
  }>;
  appointmentTrendsByDate: Array<{
    date: string;
    requested: number;
    confirmed: number;
    completed: number;
    cancelled: number;
  }>;
  peakAppointmentHours: Array<{
    hour: number;
    appointmentCount: number;
  }>;
  cancelReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

export interface DoctorPerformance {
  totalDoctors: number;
  activeDoctors: number;
  inactiveDoctors: number;
  doctorStats: Array<{
    doctorId: string;
    doctorName: string;
    specialty: string;
    status: string;
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    appointmentCompletionRate: number;
    branchCount: number;
    branches: string[];
  }>;
  specialtyDistribution: Array<{
    specialty: string;
    doctorCount: number;
    appointmentCount: number;
  }>;
}

export interface BranchPerformance {
  totalBranches: number;
  activeBranches: number;
  inactiveBranches: number;
  branches: Array<{
    branchId: string;
    branchName: string;
    address: string;
    status: string;
    doctorCount: number;
    patientCount: number;
    totalAppointments: number;
    completedAppointments: number;
    virtualAppointmentsCount: number;
    physicalAppointmentsCount: number;
    completionRate: number;
  }>;
}

export interface PatientAnalytics {
  totalPatients: number;
  activePatients: number;
  newPatientsThisMonth: number;
  newPatientsThisYear: number;
  returningPatients: number;
  newVsReturning: {
    new: number;
    returning: number;
  };
  appointmentBookingTrend: Array<{
    date: string;
    newPatients: number;
    appointments: number;
  }>;
  patientsByBranch: Array<{
    branchId: string;
    branchName: string;
    patientCount: number;
    newThisMonth: number;
  }>;
}

export interface SystemHealthReport {
  videoCallMetrics: {
    totalVideoSessions: number;
    successfulSessions: number;
    failedSessions: number;
    averageSessionDuration: number;
    successRate: number;
  };
  apiMetrics: {
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
  };
  databaseMetrics: {
    totalRecords: number;
    recordsByModel: Record<string, number>;
  };
  timestamp: Date;
}

// ============================================
// APPOINTMENT REPORTS
// ============================================

export async function generateAppointmentReport(
  hospitalId: string,
  timeframe: "week" | "month" | "year" = "month"
): Promise<AppointmentMetrics> {
  let startDate: Date;
  let endDate = new Date();

  if (timeframe === "week") {
    startDate = subDays(endDate, 7);
  } else if (timeframe === "year") {
    startDate = startOfYear(endDate);
  } else {
    startDate = startOfMonth(endDate);
  }

  // Get base appointment data
  const appointments = await db.appointment.findMany({
    where: {
      hospitalId,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      doctor: true,
      patient: true,
    },
  });

  // Calculate summary metrics
  const totalAppointments = appointments.length;
  const completedAppointments = appointments.filter(
    (a) => a.status === "completed"
  ).length;
  const cancelledAppointments = appointments.filter(
    (a) => a.status === "cancelled"
  ).length;
  const virtualAppointments = appointments.filter(
    (a) => a.appointmentType === "virtual"
  ).length;
  const physicalAppointments = appointments.filter(
    (a) => a.appointmentType === "physical"
  ).length;

  // Doctor-level metrics
  const doctorMetrics: Record<
    string,
    {
      name: string;
      completed: number;
      total: number;
    }
  > = {};

  appointments.forEach((apt) => {
    if (!doctorMetrics[apt.doctorId]) {
      doctorMetrics[apt.doctorId] = {
        name: apt.doctor?.fullName || "Unknown",
        completed: 0,
        total: 0,
      };
    }
    doctorMetrics[apt.doctorId].total++;
    if (apt.status === "completed") {
      doctorMetrics[apt.doctorId].completed++;
    }
  });

  const completionRateByDoctor = Object.entries(doctorMetrics).map(
    ([doctorId, data]) => ({
      doctorId,
      doctorName: data.name,
      completedCount: data.completed,
      totalCount: data.total,
      completionRate: (data.completed / data.total) * 100,
    })
  );

  // Appointment trends by date
  const trendMap: Record<
    string,
    {
      requested: number;
      confirmed: number;
      completed: number;
      cancelled: number;
    }
  > = {};

  appointments.forEach((apt) => {
    const dateStr = apt.scheduledAt.toISOString().split("T")[0];
    if (!trendMap[dateStr]) {
      trendMap[dateStr] = {
        requested: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
      };
    }
    const status = apt.status as keyof typeof trendMap[string];
    if (status in trendMap[dateStr]) {
      trendMap[dateStr][status]++;
    }
  });

  const appointmentTrendsByDate = Object.entries(trendMap)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, counts]) => ({
      date,
      ...counts,
    }));

  // Peak hours
  const hourCounts: Record<number, number> = {};
  appointments.forEach((apt) => {
    const hour = apt.scheduledAt.getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const peakAppointmentHours = Object.entries(hourCounts)
    .map(([hour, count]) => ({
      hour: parseInt(hour),
      appointmentCount: count,
    }))
    .sort((a, b) => b.appointmentCount - a.appointmentCount)
    .slice(0, 5);

  // Cancel reasons
  const cancelledWithReason = appointments
    .filter((a) => a.status === "cancelled" && a.cancelReason)
    .map((a) => a.cancelReason!);

  const reasonCounts: Record<string, number> = {};
  cancelledWithReason.forEach((reason) => {
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });

  const cancelReasons = Object.entries(reasonCounts)
    .map(([reason, count]) => ({
      reason,
      count,
      percentage: (count / cancelledAppointments) * 100,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalAppointments,
    completedAppointments,
    cancelledAppointments,
    noShowAppointments: 0, // Would need additional tracking
    virtualAppointments,
    physicalAppointments,
    averageCompletionRate:
      (completedAppointments / totalAppointments) * 100 || 0,
    completionRateByDoctor,
    appointmentTrendsByDate,
    peakAppointmentHours,
    cancelReasons,
  };
}

// ============================================
// DOCTOR PERFORMANCE REPORTS
// ============================================

export async function generateDoctorPerformanceReport(
  hospitalId: string
): Promise<DoctorPerformance> {
  const doctors = await db.user.findMany({
    where: {
      hospitalId,
      role: "DOCTOR",
    },
  });

  const appointments = await db.appointment.findMany({
    where: {
      hospitalId,
    },
    include: {
      doctor: true,
    },
  });

  // Get doctor profiles separately
  const doctorProfiles = await db.doctorProfile.findMany({
    where: {
      userId: {
        in: doctors.map((d) => d.id),
      },
    },
  });

  const profileMap = new Map(doctorProfiles.map((p) => [p.userId, p]));

  // Get branches for each doctor
  const doctorBranchMap = new Map<string, any[]>();
  for (const doctor of doctors) {
    const branches = await db.branch.findMany({
      where: {
        users: {
          some: {
            id: doctor.id,
          },
        },
      },
    });
    doctorBranchMap.set(doctor.id, branches);
  }

  const doctorStats = doctors.map((doctor) => {
    const doctorAppointments = appointments.filter(
      (a) => a.doctorId === doctor.id
    );
    const completed = doctorAppointments.filter(
      (a) => a.status === "completed"
    ).length;
    const cancelled = doctorAppointments.filter(
      (a) => a.status === "cancelled"
    ).length;

    const profile = profileMap.get(doctor.id);
    const branches = doctorBranchMap.get(doctor.id) || [];

    return {
      doctorId: doctor.id,
      doctorName: doctor.fullName,
      specialty: profile?.specialty || "Not specified",
      status: doctor.status,
      totalAppointments: doctorAppointments.length,
      completedAppointments: completed,
      cancelledAppointments: cancelled,
      appointmentCompletionRate:
        doctorAppointments.length > 0
          ? (completed / doctorAppointments.length) * 100
          : 0,
      branchCount: branches.length,
      branches: branches.map((b) => b.name),
    };
  });

  // Specialty distribution
  const specialtyMap: Record<string, { count: number; appointments: number }> =
    {};

  doctorStats.forEach((doc) => {
    const specialty = doc.specialty;
    if (!specialtyMap[specialty]) {
      specialtyMap[specialty] = { count: 0, appointments: 0 };
    }
    specialtyMap[specialty].count++;
    specialtyMap[specialty].appointments += doc.totalAppointments;
  });

  const specialtyDistribution = Object.entries(specialtyMap).map(
    ([specialty, data]) => ({
      specialty,
      doctorCount: data.count,
      appointmentCount: data.appointments,
    })
  );

  return {
    totalDoctors: doctors.length,
    activeDoctors: doctors.filter((d) => d.status === "ACTIVE").length,
    inactiveDoctors: doctors.filter((d) => d.status !== "ACTIVE").length,
    doctorStats,
    specialtyDistribution,
  };
}

// ============================================
// BRANCH PERFORMANCE REPORTS
// ============================================

export async function generateBranchPerformanceReport(
  hospitalId: string
): Promise<BranchPerformance> {
  const branches = await db.branch.findMany({
    where: {
      hospitalId,
    },
    include: {
      _count: {
        select: {
          users: { where: { role: { in: ["DOCTOR", "PATIENT"] } } },
          appointments: true,
        },
      },
    },
  });

  const appointments = await db.appointment.findMany({
    where: {
      hospitalId,
    },
  });

  const branchStats = branches.map((branch) => {
    const branchAppointments = appointments.filter(
      (a) => a.branchId === branch.id
    );
    const completed = branchAppointments.filter(
      (a) => a.status === "completed"
    ).length;
    const virtual = branchAppointments.filter(
      (a) => a.appointmentType === "virtual"
    ).length;
    const physical = branchAppointments.filter(
      (a) => a.appointmentType === "physical"
    ).length;

    return {
      branchId: branch.id,
      branchName: branch.name,
      address: branch.address,
      status: "ACTIVE", // Could be enhanced with status column
      doctorCount: branch._count.users || 0,
      patientCount: branch._count.users || 0, // Simplified
      totalAppointments: branchAppointments.length,
      completedAppointments: completed,
      virtualAppointmentsCount: virtual,
      physicalAppointmentsCount: physical,
      completionRate:
        branchAppointments.length > 0
          ? (completed / branchAppointments.length) * 100
          : 0,
    };
  });

  return {
    totalBranches: branches.length,
    activeBranches: branches.length,
    inactiveBranches: 0,
    branches: branchStats,
  };
}

// ============================================
// PATIENT ANALYTICS REPORTS
// ============================================

export async function generatePatientAnalyticsReport(
  hospitalId: string
): Promise<PatientAnalytics> {
  const patients = await db.user.findMany({
    where: {
      hospitalId,
      role: "PATIENT",
    },
  });

  const appointments = await db.appointment.findMany({
    where: {
      hospitalId,
    },
    include: {
      patient: true,
    },
  });

  const now = new Date();
  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  const newPatientsThisMonth = patients.filter(
    (p) => p.createdAt >= monthStart
  ).length;
  const newPatientsThisYear = patients.filter(
    (p) => p.createdAt >= yearStart
  ).length;

  // Count patient appointments to determine returning vs new
  const patientAppointmentCounts = new Map<string, number>();
  appointments.forEach((apt) => {
    const count = patientAppointmentCounts.get(apt.patientId) || 0;
    patientAppointmentCounts.set(apt.patientId, count + 1);
  });

  const returningPatients = patients.filter(
    (p) => (patientAppointmentCounts.get(p.id) || 0) > 1
  ).length;
  const newPatientCount = patients.length - returningPatients;

  // Get appointment trends
  const lastThirtyDays = subDays(now, 30);
  const recentAppointments = appointments.filter(
    (a) => a.scheduledAt >= lastThirtyDays
  );

  const appointmentTrendMap: Record<
    string,
    { newPatients: number; appointments: number }
  > = {};

  recentAppointments.forEach((apt) => {
    const dateStr = apt.createdAt.toISOString().split("T")[0];
    if (!appointmentTrendMap[dateStr]) {
      appointmentTrendMap[dateStr] = {
        newPatients: 0,
        appointments: 0,
      };
    }
    appointmentTrendMap[dateStr].appointments++;

    if (apt.patient && apt.patient.createdAt.toISOString().split("T")[0] === dateStr) {
      appointmentTrendMap[dateStr].newPatients++;
    }
  });

  const appointmentBookingTrend = Object.entries(appointmentTrendMap)
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, data]) => ({
      date,
      ...data,
    }));

  // Patients by branch
  const branches = await db.branch.findMany({
    where: {
      hospitalId,
    },
  });

  const patientsByBranch = await Promise.all(
    branches.map(async (branch) => {
      const branchPatients = await db.user.count({
        where: {
          hospitalId,
          branchId: branch.id,
          role: "PATIENT",
        },
      });

      const newThisMonth = await db.user.count({
        where: {
          hospitalId,
          branchId: branch.id,
          role: "PATIENT",
          createdAt: { gte: monthStart },
        },
      });

      return {
        branchId: branch.id,
        branchName: branch.name,
        patientCount: branchPatients,
        newThisMonth,
      };
    })
  );

  return {
    totalPatients: patients.length,
    activePatients: patients.length,
    newPatientsThisMonth,
    newPatientsThisYear,
    returningPatients,
    newVsReturning: {
      new: newPatientCount,
      returning: returningPatients,
    },
    appointmentBookingTrend,
    patientsByBranch,
  };
}

// ============================================
// SYSTEM HEALTH REPORTS
// ============================================

export async function generateSystemHealthReport(
  hospitalId: string
): Promise<SystemHealthReport> {
  // Video call metrics from appointments with video call tracking
  const lastDayAppointments = await db.appointment.findMany({
    where: {
      hospitalId,
      scheduledAt: {
        gte: subDays(new Date(), 1),
      },
      appointmentType: "virtual",
    },
  });

  const videoSessions = lastDayAppointments.filter(
    (a) => a.videoCallStartedAt !== null
  );
  const successfulSessions = videoSessions.filter(
    (a) => a.videoCallEndedAt !== null
  ).length;
  const failedSessions = videoSessions.length - successfulSessions;

  let averageSessionDuration = 0;
  if (videoSessions.length > 0) {
    const durations = videoSessions
      .filter((a) => a.videoCallStartedAt && a.videoCallEndedAt)
      .map(
        (a) =>
          (a.videoCallEndedAt!.getTime() - a.videoCallStartedAt!.getTime()) /
          60000
      );
    averageSessionDuration =
      durations.reduce((a, b) => a + b, 0) / durations.length;
  }

  // Database metrics
  const [
    totalUsers,
    totalAppointments,
    totalBranches,
    totalDoctors,
    totalPatients,
    totalHospitals,
  ] = await Promise.all([
    db.user.count({ where: { hospitalId } }),
    db.appointment.count({ where: { hospitalId } }),
    db.branch.count({ where: { hospitalId } }),
    db.user.count({ where: { hospitalId, role: "DOCTOR" } }),
    db.user.count({ where: { hospitalId, role: "PATIENT" } }),
    db.hospital.count(),
  ]);

  return {
    videoCallMetrics: {
      totalVideoSessions: videoSessions.length,
      successfulSessions,
      failedSessions,
      averageSessionDuration,
      successRate:
        videoSessions.length > 0
          ? (successfulSessions / videoSessions.length) * 100
          : 0,
    },
    apiMetrics: {
      totalRequests: 0, // Would need separate tracking
      errorRate: 0, // Would need separate tracking
      averageResponseTime: 0, // Would need separate tracking
    },
    databaseMetrics: {
      totalRecords:
        totalUsers +
        totalAppointments +
        totalBranches +
        totalDoctors +
        totalPatients,
      recordsByModel: {
        users: totalUsers,
        appointments: totalAppointments,
        branches: totalBranches,
        doctors: totalDoctors,
        patients: totalPatients,
        hospitals: totalHospitals,
      },
    },
    timestamp: new Date(),
  };
}
