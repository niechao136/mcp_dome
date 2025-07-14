# 使用官方 Node.js 镜像
FROM node:18

# 设置工作目录
WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install

# 拷贝源代码（可省略，使用 volumes 挂载）
COPY . .

# 读取 .env 中的 PORT
ENV PORT=${PORT}

# 暴露端口
EXPOSE ${PORT}

# 启动服务
CMD ["node", "index.js"]
