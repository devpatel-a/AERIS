import { useEffect, useRef } from "react";
import * as echarts from "echarts";

interface EChartProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- ECharts option literals
  // (e.g. `type: "category"`) widen to `string` in plain object literals, which fights
  // echarts' large discriminated-union option type; callers build plain option objects.
  option: any;
  height?: number | string;
}

/** Thin wrapper mounting one ECharts instance into a div, resized on window resize. */
export default function EChart({ option, height = 260 }: EChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    chartRef.current = echarts.init(ref.current, "dark");
    const onResize = () => chartRef.current?.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chartRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={ref} style={{ width: "100%", height }} />;
}
