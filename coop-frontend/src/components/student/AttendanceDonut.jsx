import React, { useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

const SLICE_COLORS = {
  present: 0x10b981, // emerald-500
  late: 0xf59e0b,    // amber-500
  leave: 0x0ea5e9,   // sky-500
  absent: 0xf43f5e,  // rose-500
};

const AttendanceDonut = ({ present = 0, late = 0, leave = 0, absent = 0, centerLabel = '' }) => {
  const chartRef = useRef(null);

  useLayoutEffect(() => {
    const root = am5.Root.new(chartRef.current);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        innerRadius: am5.percent(72),
        layout: root.verticalLayout,
      })
    );

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: 'value',
        categoryField: 'label',
      })
    );
    series.slices.template.setAll({
      cornerRadius: 6,
      stroke: am5.color(0xffffff),
      strokeWidth: 2,
      strokeOpacity: 1,
    });
    series.labels.template.set('visible', false);
    series.ticks.template.set('visible', false);
    series.set(
      'colors',
      am5.ColorSet.new(root, {
        colors: [
          am5.color(SLICE_COLORS.present),
          am5.color(SLICE_COLORS.late),
          am5.color(SLICE_COLORS.leave),
          am5.color(SLICE_COLORS.absent),
        ],
        reuse: false,
      })
    );
    series.slices.template.states.create('hover', { scale: 1.04 });
    series.slices.template.set('tooltipText', '{label}: {value} วัน');

    series.data.setAll([
      { label: 'มาตรงเวลา', value: present },
      { label: 'สาย', value: late },
      { label: 'ลา / หยุด', value: leave },
      { label: 'ขาด', value: absent },
    ]);

    if (centerLabel) {
      chart.seriesContainer.children.push(
        am5.Label.new(root, {
          text: centerLabel,
          centerX: am5.p50,
          centerY: am5.p50,
          fontSize: 22,
          fontWeight: '700',
          fill: am5.color(0x1e293b),
          textAlign: 'center',
        })
      );
    }

    series.appear(700, 80);
    return () => root.dispose();
  }, [present, late, leave, absent, centerLabel]);

  return <div ref={chartRef} style={{ width: '100%', height: 220 }} />;
};

export default AttendanceDonut;
