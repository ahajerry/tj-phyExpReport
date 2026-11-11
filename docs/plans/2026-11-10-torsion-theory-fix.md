# 扭摆平行轴理论修复

状态：代码与自动验收完成，未部署。当前公式和精度契约见 [实验规则](../specs/experiments.md#扭摆惯量与末端修约)，输入要求见 [字段目录](../specs/fields.md#用扭摆法测定物体转动惯量moment-of-inertia)。

## 变更

- 平行轴理论基线从细杆实测惯量改为质量、长度计算的理论惯量；理论图点和百分差同步修正。
- 滑块自身惯量要求正值，前端去除默认零；当前和旧规范化输入均检查。既有 XLSX 导入已读取并换算该字段，无需增加映射。
- Typst 公式明确 I₄′；I₅ 改为装置给定的两滑块质心轴惯量之和，不再展示与该定义不一致的几何公式。
- 新增数值回归输入 `server/testdata/torsion-parallel-axis.json`，校验理论值不随细杆计时变化、无效 I₅ 和圆筒内外径。历史计算参考仅更新受影响的平行轴理论、百分差和理论图点，依据独立十进制公式计算。

## 2026-11-10 验证

- `pnpm test:backend`：宿主无 Go，改用 `phyexp-report:dev` 隔离容器执行等价 `go test ./...`，全部通过。
- `pnpm lint`、`pnpm test:experiment-data`、`pnpm test:precision`、`pnpm test:samples`、`pnpm exec tsc -b`：通过。
- 本机 `pnpm exec vite build --configLoader native`：通过。生产 Docker 构建中的标准 `pnpm build` 也通过。
- `docker build -t phyexp-report:torsion-baseline-fix .`：通过。
- 指定 `REPORT_TEST_IMAGE=phyexp-report:torsion-baseline-fix` 后运行 `pnpm test:docker`：通过 16 份 PDF 与源码离线重编译、10 项导入、7 种图片格式、访问隔离及重启恢复。包含扭摆基础与导入报告，源码重编译摘要一致，无编译警告。
- `git diff --check`：通过。

测试使用独立临时容器与临时卷，不读取用户 `.report-data/`。未运行逐页人工视觉验收或版式基准检查；没有修改队列/并发逻辑，未运行 race。原报告文件不会追溯重算，部署后需重新生成。
