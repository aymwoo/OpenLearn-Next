// 屏蔽 server-only 错误，允许 Node 脚本正常运行
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// 重写 server-only，不抛错
require.cache[require.resolve('server-only')] = {
  exports: {}
};
