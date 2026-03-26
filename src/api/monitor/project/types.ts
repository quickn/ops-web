
export interface Project extends PageQuery {
  id?: number;
  name?: string;
  type?: number;
  sourceDir?: string;
  targetDir?: string;
  remark?: string;
}
