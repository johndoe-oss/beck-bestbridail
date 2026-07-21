declare namespace Express {
  interface Request {
    customer?: {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
    };
    admin?: {
      id: number;
      email: string;
      name: string;
    };
  }
}
