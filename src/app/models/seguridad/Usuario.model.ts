export interface Usuario {
    id: number,
    username: string,
    email: string | null,
    nombre: string | null,
    apellido: string | null,
    grupos: string[] | null,
    is_superuser: boolean
}

export interface CrearUsuario {
    username: string;
    password: string | null;
    grupo_id: number;
    email?: string | null;
}

export interface RegistrarCliente {
    username: string;
    password: string;
    nombre: string;
    apellido: string;
    fecha_nacimiento: string;
    email?: string;
}