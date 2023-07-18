import { responseMasterCpuprofile } from './utils';

/**
 * yunfly plugin
 * @returns {void}
 */
export default function v8ProfilerPlugin({ }: any): void {
  responseMasterCpuprofile();
}


