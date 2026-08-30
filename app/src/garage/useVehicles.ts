import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createVehicle,
  fetchVehicle,
  fetchVehicles,
  updateVehicleFinancials,
  updateVehicleMileage,
  type NewVehicleInput,
} from './api';
import type { ReliabilityBucket, VehicleCondition } from '@fixorreplace/types';

export function useVehicles() {
  return useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles });
}

export function useVehicle(id: string) {
  return useQuery({ queryKey: ['vehicles', id], queryFn: () => fetchVehicle(id), enabled: Boolean(id) });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewVehicleInput) => createVehicle(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
  });
}

export function useUpdateVehicleMileage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, currentMileage }: { id: string; currentMileage: number }) =>
      updateVehicleMileage(id, currentMileage),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', vehicle.id] });
    },
  });
}

export function useUpdateVehicleFinancials() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      currentLoanPayoff,
      condition,
      reliabilityBucket,
    }: {
      id: string;
      currentLoanPayoff: number;
      condition: VehicleCondition;
      reliabilityBucket: ReliabilityBucket;
    }) => updateVehicleFinancials(id, { currentLoanPayoff, condition, reliabilityBucket }),
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['vehicles', vehicle.id] });
    },
  });
}
