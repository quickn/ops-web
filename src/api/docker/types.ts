import {b} from "vite-plugin-mock/dist/types-5af01a9a";

export interface DockerContainer extends PageQuery{
  id?: number | null;
  names?: string;
  hostname?: string;
  isMonitor?: boolean;
  serviceId?: number;
  serviceName?: string;
  updateTime?: string;
  sort?: number;
}

export interface DockerContainerInfo {
  id?: number | null;
  names?: string;
  hostname?: string;
  isMonitor?: boolean;
  serviceId?: number;
  serviceName?: string;
  sort?: number;
}
