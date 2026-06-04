import { useLayoutEffect } from 'react';
import * as am5 from "@amcharts/amcharts5";
import * as am5percent from "@amcharts/amcharts5/percent";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

const ProjectChart = ({ data }) => {
  useLayoutEffect(() => {
    // 1. Inisialisasi Root element
    const root = am5.Root.new("chartdiv");

    // 2. Set Theme animasi
    root.setThemes([am5themes_Animated.new(root)]);

    // 3. Buat Chart
    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        layout: root.verticalLayout,
        innerRadius: am5.percent(50) // Membuatnya menjadi Donut Chart agar modern
      })
    );

    // 4. Buat Series
    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: "value",
        categoryField: "category",
        alignLabels: false
      })
    );

    // Mengatur warna agar sesuai dengan status (Opsional)
    series.get("colors").set("colors", [
      am5.color(0xFACC15), // Yellow (Hold)
      am5.color(0x3B82F6), // Blue (In Progress)
      am5.color(0x22C55E), // Green (Done)
      am5.color(0xEF4444)  // Red (Late)
    ]);

    // 5. Memasukkan data dari props
    series.data.setAll([
      { category: "HOLD", value: data.hold || 0 },
      { category: "IN PROGRESS", value: data.inProgress || 0 },
      { category: "DONE", value: data.done || 0 },
      { category: "LATE", value: data.late || 0 }
    ]);

    // Animasi saat muncul
    series.appear(1000, 100);

    // 6. Cleanup saat komponen tidak digunakan (penting di React!)
    return () => {
      root.dispose();
    };
  }, [data]);

  return (
    <div className="w-full h-full flex flex-col items-center">
      <div id="chartdiv" style={{ width: "100%", height: "300px" }}></div>
    </div>
  );
};

export default ProjectChart;