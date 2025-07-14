# 使用官方 Node.js 镜像
FROM node:18

# 设置工作目录
WORKDIR /app

# 拷贝文件
COPY package*.json ./
COPY index.js ./
COPY openapi.yaml ./

# 安装依赖
RUN npm install

# 暴露端口
EXPOSE 8080

# 启动服务
CMD ["node", "index.js"]
