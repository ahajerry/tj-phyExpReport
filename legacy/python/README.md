# Python 历史实现

这里保存迁移前的后端、PyInstaller 配置和旧部署/验证脚本，供查阅算法及原有行为。它们不进入 Docker 镜像，不是当前启动或发布入口。历史脚本保留旧目录假设，不保证在归档路径下直接执行。

当前 Go 实现在 `server/`，可运行的回归样本在 `server/testdata/`。旧 standalone binary 若仍在 `output/backend/`，也不属于当前 Go 部署产物。原始用户数据未迁移或修改。
