import type { ReliabilityBucket, Vehicle, VehicleCondition } from '@fixorreplace/types';
import { supabase } from '../lib/supabase';

interface VehicleRow {
  id: string;
  user_id: string;
  vin: string | null;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  engine: string | null;
  drivetrain: string | null;
  body: string | null;
  nickname: string | null;
  primary_driver: Vehicle['primaryDriver'];
  zip: string;
  current_mileage: number;
  current_loan_payoff: number;
  condition: VehicleCondition | null;
  reliability_bucket: ReliabilityBucket | null;
  created_at: string;
}

function rowToVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    userId: row.user_id,
    vin: row.vin,
    year: row.year,
    make: row.make,
    model: row.model,
    trim: row.trim,
    engine: row.engine,
    drivetrain: row.drivetrain,
    body: row.body,
    nickname: row.nickname,
    primaryDriver: row.primary_driver,
    zip: row.zip,
    currentMileage: row.current_mileage,
    currentLoanPayoff: Number(row.current_loan_payoff),
    // Onboarding (blueprint Screen 6) deliberately doesn't ask about condition
    // or reliability history yet -- those are collected later, in the repair
    // intake flow (Screen 12). These are placeholder defaults until then.
    condition: row.condition ?? 'good',
    reliabilityBucket: row.reliability_bucket ?? 'reliable',
    createdAt: row.created_at,
  };
}

export interface NewVehicleInput {
  vin?: string | null;
  year: number;
  make: string;
  model: string;
  trim?: string | null;
  nickname?: string | null;
  primaryDriver?: Vehicle['primaryDriver'];
  zip: string;
  currentMileage: number;
}

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from('vehicles').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data as VehicleRow[]).map(rowToVehicle);
}

export async function fetchVehicle(id: string): Promise<Vehicle> {
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).single();
  if (error) throw error;
  return rowToVehicle(data as VehicleRow);
}

export async function createVehicle(input: NewVehicleInput): Promise<Vehicle> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Not signed in');

  const { data, error } = await supabase
    .from('vehicles')
    .insert({
      user_id: user.id,
      vin: input.vin ?? null,
      year: input.year,
      make: input.make,
      model: input.model,
      trim: input.trim ?? null,
      nickname: input.nickname ?? null,
      primary_driver: input.primaryDriver ?? null,
      zip: input.zip,
      current_mileage: input.currentMileage,
    })
    .select('*')
    .single();

  if (error) throw error;
  return rowToVehicle(data as VehicleRow);
}

export async function updateVehicleMileage(id: string, currentMileage: number): Promise<Vehicle> {
  const { data, error } = await supabase
    .from('vehicles')
    .update({ current_mileage: currentMileage })
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return rowToVehicle(data as VehicleRow);
}
