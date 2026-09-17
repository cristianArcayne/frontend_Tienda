import { Permiso } from "./permisos.model";

export interface Rol {
    id: number;
    name: string;
    permisos: Permiso[];
}

export interface CrearRol {
    name: string;
    permisos_ids: number[]; // IDs de los permisos asignados
}