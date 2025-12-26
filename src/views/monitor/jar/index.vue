<template>
  <div class="app-container">
    <div class="search-container">
      <el-form ref="queryFormRef" :model="queryParams" :inline="true">
        <el-form-item prop="fileName" label="" style="width: 150px">
          <el-input
            v-model="queryParams.fileName"
            placeholder="文件名"
            clearable
            @keyup.enter="handleQuery"
          />
        </el-form-item>

        <el-form-item label="服务" prop="serviceId" style="width: 120px">
          <el-select
            v-model="queryParams.serviceId"
            placeholder="全部服务"
            clearable
          >
            <el-option
              v-for="item in serviceList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="状态" prop="status" style="width: 120px">
          <el-select v-model="queryParams.status" placeholder="全部" clearable>
            <el-option label="未部署" :value="0" />
            <el-option label="部署中" :value="1" />
            <el-option label="部署成功" :value="2" />
            <el-option label="部署失败" :value="3" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleQuery">
            <el-icon><Search /></el-icon>搜索
          </el-button>
          <el-button @click="resetQuery">
            <el-icon><Refresh /></el-icon>重置
          </el-button>
        </el-form-item>

        <el-form-item style="margin-left: 20px">
          <el-button type="success" @click="showUploadDialog">
            <el-icon><Upload /></el-icon>上传JAR
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card shadow="never">
      <el-table
        ref="dataTableRef"
        v-loading="loading"
        :data="dataList"
        highlight-current-row
        border
      >
        <el-table-column label="文件名" prop="fileName" width="180" />
        <el-table-column label="服务名称" prop="serviceName" width="120">
          <template #default="scope">
            <el-tag v-if="scope.row.serviceName" type="info">
              {{ scope.row.serviceName }}
            </el-tag>
            <span v-else style="color: #999">未关联</span>
          </template>
        </el-table-column>
        <el-table-column label="版本号" prop="version" width="100">
          <template #default="scope">
            <el-tag type="info">{{ scope.row.version }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="备注" prop="remark" width="150" />
        <el-table-column label="Dockerfile" width="100" align="center">
          <template #default="scope">
            <el-tag v-if="hasDockerfile(scope.row)" type="success"
              >已设置</el-tag
            >
            <el-tag v-else type="warning">未设置</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="部署目标" width="220">
          <template #default="scope">
            <div v-if="scope.row.agentNames">
              <div style="margin-bottom: 4px; font-size: 12px; color: #666">
                <el-icon><Monitor /></el-icon>
                {{ scope.row.agentNames.split(",")[0] }}
                <span v-if="scope.row.agentNames.split(',').length > 1">
                  等{{ scope.row.agentNames.split(",").length }}个
                </span>
              </div>
              <div style="font-size: 12px; color: #999">
                <el-icon><Box /></el-icon>
                {{ scope.row.targetContainerNames.split(",")[0] }}
                <span
                  v-if="scope.row.targetContainerNames.split(',').length > 1"
                >
                  等{{ scope.row.targetContainerNames.split(",").length }}个
                </span>
              </div>
            </div>
            <span v-else style="font-size: 12px; color: #999">未部署</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="上传时间" prop="createTime" width="160" />
        <el-table-column fixed="right" label="操作" width="420" align="center">
          <template #default="scope">
            <!-- 新增：版本号按钮 -->
            <el-button
              type="info"
              size="small"
              link
              @click="showVersionsDialog(scope.row.fileName)"
            >
              <el-icon><Histogram /></el-icon>版本号
            </el-button>

            <el-button
              v-if="!hasDockerfile(scope.row)"
              type="warning"
              size="small"
              link
              @click="showDockerfileDialog(scope.row)"
            >
              <el-icon><Edit /></el-icon>设置Dockerfile
            </el-button>
            <el-button
              v-else-if="scope.row.status === 0 || scope.row.status === 3"
              type="primary"
              size="small"
              link
              @click="showDeployDialog(scope.row)"
            >
              <el-icon><Setting /></el-icon>部署
            </el-button>

            <!-- 替换JAR包按钮 -->
            <el-button
              type="info"
              size="small"
              link
              @click="showReplaceDialog(scope.row)"
            >
              <el-icon><Refresh /></el-icon>替换文件
            </el-button>

            <!-- 重新部署按钮 -->
            <el-button
              v-if="scope.row.status === 2"
              type="warning"
              size="small"
              link
              @click="showRedeployDialog(scope.row)"
            >
              <el-icon><RefreshRight /></el-icon>重新部署
            </el-button>

            <!-- 新增：重新构建容器按钮 -->
            <el-button
              v-if="scope.row.status === 2"
              type="success"
              size="small"
              link
              @click="showRebuildDialog(scope.row)"
            >
              <el-icon><Setting /></el-icon>重新构建
            </el-button>

            <el-button
              type="info"
              size="small"
              link
              @click="showDockerfileDialog(scope.row)"
            >
              <el-icon><Document /></el-icon>Dockerfile
            </el-button>

            <el-button
              type="info"
              size="small"
              link
              @click="viewDeployLogs(scope.row.id)"
            >
              <el-icon><Notebook /></el-icon>日志
            </el-button>

            <el-button
              type="danger"
              size="small"
              link
              @click="deleteJarPackage(scope.row.id)"
            >
              <el-icon><Delete /></el-icon>删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <pagination
        v-if="total > 0"
        v-model:total="total"
        v-model:page="queryParams.pageNum"
        v-model:limit="queryParams.pageSize"
        @pagination="handleQuery"
      />
    </el-card>

    <!-- 上传对话框 -->
    <el-dialog
      v-model="uploadDialogVisible"
      title="上传JAR包"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        :model="uploadForm"
        label-width="80px"
        ref="uploadFormRef"
        :rules="uploadRules"
      >
        <el-form-item label="关联服务" prop="serviceId" required>
          <el-select
            v-model="uploadForm.serviceId"
            placeholder="请选择服务"
            style="width: 100%"
          >
            <el-option
              v-for="item in serviceList"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
          <div style="margin-top: 5px; font-size: 12px; color: #909399">
            • 必须选择服务用于分类管理
          </div>
        </el-form-item>

        <el-form-item label="JAR文件" prop="file" required>
          <div class="upload-area" @click="triggerFileInput">
            <div class="upload-content" v-if="!selectedFile">
              <el-icon size="48" color="#409EFF"><Upload /></el-icon>
              <div style="margin-top: 12px; font-weight: 500; color: #409eff">
                点击或拖拽文件到此处
              </div>
              <div style="margin-top: 8px; font-size: 12px; color: #909399">
                支持 .jar 格式文件
              </div>
            </div>
            <div class="file-preview" v-else>
              <el-icon size="32" color="#67C23A"><CircleCheck /></el-icon>
              <div style="margin-top: 8px; text-align: center">
                <div style="font-weight: 500; color: #303133">
                  {{ selectedFile.name }}
                </div>
                <div style="margin-top: 4px; font-size: 12px; color: #909399">
                  {{ formatFileSize(selectedFile.size) }}
                </div>
              </div>
              <el-button
                size="small"
                type="danger"
                text
                @click.stop="removeFile"
                style="margin-top: 12px"
              >
                移除
              </el-button>
            </div>
            <input
              ref="fileInputRef"
              type="file"
              @change="handleFileChange"
              accept=".jar"
              style="display: none"
            />
          </div>
          <div style="margin-top: 10px; font-size: 12px; color: #909399">
            <div>• 最大文件大小：500MB</div>
            <div>• 请确保JAR包为可执行的Spring Boot应用</div>
          </div>
        </el-form-item>

        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="uploadForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入JAR包的备注信息（可选）"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button
          @click="uploadDialogVisible = false"
          :disabled="uploadLoading"
          >取消</el-button
        >
        <el-button
          type="primary"
          @click="handleUpload"
          :loading="uploadLoading"
          :disabled="!selectedFile || !uploadForm.serviceId"
        >
          上传
        </el-button>
      </template>
    </el-dialog>

    <!-- Dockerfile对话框 -->
    <el-dialog
      v-model="dockerfileDialogVisible"
      :title="`Dockerfile - ${currentJarName}`"
      width="800px"
      :close-on-click-modal="false"
    >
      <div v-loading="dockerfileLoading">
        <el-alert
          type="info"
          title="首次部署前需要先设置Dockerfile"
          description="重新部署时将只替换JAR包，不需要重新构建Docker镜像"
          show-icon
          style="margin-bottom: 15px"
        />

        <el-form>
          <el-form-item>
            <el-input
              v-model="dockerfileContent"
              type="textarea"
              :rows="20"
              placeholder="请输入Dockerfile内容"
              resize="none"
            />
          </el-form-item>
        </el-form>

        <div style="margin-top: 10px; font-size: 12px; color: #666">
          提示：JAR文件将通过下载方式提供给Agent，路径为/home/park/{{
            currentJarName || "app.jar"
          }}
        </div>
      </div>

      <template #footer>
        <el-button @click="dockerfileDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleSaveDockerfile"
          :loading="dockerfileLoading"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 部署对话框 -->
    <el-dialog
      v-model="deployDialogVisible"
      :title="`部署 - ${currentJarName}`"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-alert
        type="info"
        title="部署说明"
        description="系统会自动判断：容器不存在则创建新容器，容器已存在则替换JAR包"
        show-icon
        style="margin-bottom: 20px"
      />

      <div style="margin-bottom: 15px">
        <el-button type="primary" @click="addDeployTarget" size="small">
          <el-icon><Plus /></el-icon>添加部署目标
        </el-button>
        <span style="margin-left: 10px; font-size: 12px; color: #666">
          可以选择多个Agent进行部署
        </span>
      </div>

      <el-table :data="deployTargets" border style="margin-bottom: 20px">
        <el-table-column label="序号" width="60" align="center">
          <template #default="scope">
            {{ scope.$index + 1 }}
          </template>
        </el-table-column>

        <el-table-column label="Agent" min-width="250">
          <template #default="scope">
            <el-select
              v-model="scope.row.agentId"
              placeholder="选择Agent"
              style="width: 100%"
              @change="
                () => generateContainerName(scope.row.agentId, scope.$index)
              "
            >
              <el-option
                v-for="agent in agentsList"
                :key="agent.agentId"
                :label="`${agent.agentName} (${agent.agentIp}:${agent.agentPort})`"
                :value="agent.agentId"
              >
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                  "
                >
                  <span>{{ agent.agentName }}</span>
                  <span style="font-size: 12px; color: #999">
                    {{ agent.agentIp }}:{{ agent.agentPort }}
                    <el-tag
                      v-if="!agent.hasContainers"
                      size="small"
                      type="warning"
                      >无容器</el-tag
                    >
                    <el-tag v-else size="small" type="success"
                      >{{ agent.containerCount }}个容器</el-tag
                    >
                  </span>
                </div>
              </el-option>
            </el-select>
          </template>
        </el-table-column>

        <el-table-column label="容器名称" min-width="250">
          <template #default="scope">
            <el-input
              v-model="scope.row.containerName"
              :placeholder="getContainerNamePlaceholder(currentJarName)"
              @blur="scope.row.containerName = scope.row.containerName.trim()"
            />
          </template>
        </el-table-column>

        <el-table-column label="操作" width="80" align="center">
          <template #default="scope">
            <el-button
              v-if="deployTargets.length > 1"
              type="danger"
              size="small"
              link
              @click="removeDeployTarget(scope.$index)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div
        style="
          padding: 15px;
          margin-bottom: 20px;
          background: #f5f7fa;
          border-radius: 4px;
        "
      >
        <h4 style="margin-top: 0; color: #409eff">部署说明：</h4>
        <ul style="padding-left: 20px; margin: 0; font-size: 13px; color: #666">
          <li>容器不存在：根据Dockerfile创建新容器</li>
          <li>容器已存在：替换容器中的JAR包并重启</li>
          <li>容器名称必须是唯一的</li>
          <li>默认使用Dockerfile中EXPOSE的端口</li>
          <li>可以同时部署到多个Agent</li>
          <li>容器名称建议使用JAR包名相关，便于识别</li>
        </ul>
      </div>

      <template #footer>
        <el-button @click="deployDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleDeploy"
          :loading="deployLoading"
          :disabled="deployTargets.length === 0"
        >
          开始部署
        </el-button>
      </template>
    </el-dialog>

    <!-- 重新部署对话框 -->
    <el-dialog
      v-model="redeployDialogVisible"
      :title="`重新部署 - ${currentJarName}`"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="!hasDeployedContainers">
        <el-empty description="暂无部署记录，无法重新部署" />
      </div>

      <div v-else>
        <el-alert
          type="info"
          title="重新部署只替换JAR包"
          description="将替换所选容器中的JAR文件，然后重启容器"
          show-icon
          style="margin-bottom: 15px"
        />

        <div
          v-for="agent in redeployAgents"
          :key="agent.agentId"
          style="margin-bottom: 20px"
        >
          <div style="margin-bottom: 8px; font-weight: bold">
            <el-icon><Monitor /></el-icon>
            {{ agent.agentName }}
            <span
              style="
                margin-left: 10px;
                font-size: 12px;
                font-weight: normal;
                color: #666;
              "
            >
              ({{ agent.agentIp }}:{{ agent.agentPort }})
            </span>
          </div>

          <div style="margin-left: 24px">
            <div v-if="agent.containers && agent.containers.length > 0">
              <div style="margin-bottom: 8px; font-size: 12px; color: #666">
                已部署的容器（默认全部选中）：
              </div>
              <el-checkbox-group v-model="agent.selectedContainers">
                <div
                  v-for="container in agent.containers"
                  :key="container.names"
                  style="margin-bottom: 8px"
                >
                  <el-checkbox :label="container.names" :value="true">
                    {{ container.names }} ({{ container.image }})
                    <el-tag
                      size="mini"
                      :type="
                        container.status.includes('Up') ? 'success' : 'danger'
                      "
                    >
                      {{
                        container.status.includes("Up") ? "运行中" : "已停止"
                      }}
                    </el-tag>
                  </el-checkbox>
                </div>
              </el-checkbox-group>
            </div>
            <div v-else style="font-size: 12px; color: #f56c6c">
              该Agent上暂无部署的容器
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="redeployDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleRedeploy"
          :loading="redeployLoading"
          :disabled="!hasSelectedContainers"
        >
          重新部署
        </el-button>
      </template>
    </el-dialog>

    <!-- 替换JAR包对话框 -->
    <el-dialog
      v-model="replaceDialogVisible"
      :title="`替换JAR包文件 - ${currentJarName}`"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form>
        <el-form-item label="JAR文件" required>
          <div class="upload-area" @click="triggerFileInput">
            <div class="upload-content" v-if="!selectedFile">
              <el-icon size="48" color="#409EFF"><Upload /></el-icon>
              <div style="margin-top: 12px; font-weight: 500; color: #409eff">
                点击或拖拽文件到此处
              </div>
              <div style="margin-top: 8px; font-size: 12px; color: #909399">
                支持 .jar 格式文件
              </div>
            </div>
            <div class="file-preview" v-else>
              <el-icon size="32" color="#67C23A"><CircleCheck /></el-icon>
              <div style="margin-top: 8px; text-align: center">
                <div style="font-weight: 500; color: #303133">
                  {{ selectedFile.name }}
                </div>
                <div style="margin-top: 4px; font-size: 12px; color: #909399">
                  {{ formatFileSize(selectedFile.size) }}
                </div>
              </div>
              <el-button
                size="small"
                type="danger"
                text
                @click.stop="removeFile"
                style="margin-top: 12px"
              >
                移除
              </el-button>
            </div>
            <input
              ref="replaceFileInputRef"
              type="file"
              @change="handleFileChange"
              accept=".jar"
              style="display: none"
            />
          </div>
          <div style="margin-top: 10px; font-size: 12px; color: #909399">
            <div>• 替换后所有部署的容器将自动重启</div>
            <div>• 请确保新JAR包与原有应用版本兼容</div>
          </div>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button
          @click="replaceDialogVisible = false"
          :disabled="replaceLoading"
          >取消</el-button
        >
        <el-button
          type="primary"
          @click="handleReplace"
          :loading="replaceLoading"
          :disabled="!selectedFile"
        >
          替换
        </el-button>
      </template>
    </el-dialog>

    <!-- 新增：版本号对话框 -->
    <el-dialog
      v-model="versionsDialogVisible"
      :title="`版本列表 - ${currentFileName}`"
      width="1200px"
      :close-on-click-modal="false"
    >
      <div v-loading="versionsLoading">
        <div style="margin-bottom: 20px">
          <el-button type="info" @click="versionsDialogVisible = false">
            <el-icon><ArrowLeft /></el-icon>返回
          </el-button>
        </div>

        <el-table :data="versionsList" border>
          <el-table-column label="版本号" prop="version" width="100">
            <template #default="scope">
              <el-tag type="info">{{ scope.row.version }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="文件名" prop="originalName" width="200" />
          <el-table-column label="服务" prop="serviceName" width="120">
            <template #default="scope">
              <el-tag v-if="scope.row.serviceName" type="info">
                {{ scope.row.serviceName }}
              </el-tag>
              <span v-else style="color: #999">未关联</span>
            </template>
          </el-table-column>
          <el-table-column
            label="备注"
            prop="remark"
            width="150"
            show-overflow-tooltip
          />
          <el-table-column label="状态" width="100" align="center">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="上传时间" prop="createTime" width="160" />
          <el-table-column label="操作" width="300" align="center">
            <template #default="scope">
              <el-button
                v-if="scope.row.status === 2"
                type="warning"
                size="small"
                link
                @click="showRedeployDialog(scope.row)"
              >
                <el-icon><RefreshRight /></el-icon>重新部署
              </el-button>
              <el-button
                v-if="scope.row.status === 2"
                type="success"
                size="small"
                link
                @click="showRebuildDialog(scope.row)"
              >
                <el-icon><Setting /></el-icon>重新构建
              </el-button>
              <el-button
                type="info"
                size="small"
                link
                @click="viewDeployLogs(scope.row.id)"
              >
                <el-icon><Notebook /></el-icon>日志
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 修改：重新构建对话框 - 使用与重新部署相同的对话框 -->
    <el-dialog
      v-model="rebuildDialogVisible"
      :title="`重新构建容器 - ${currentJarName}`"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="!hasDeployedContainers">
        <el-empty description="暂无部署记录，无法重新构建容器" />
      </div>

      <div v-else>
        <el-alert
          type="info"
          title="重新构建容器（使用Dockerfile重新构建镜像）"
          description="将使用Dockerfile重新构建镜像，然后创建新容器并部署"
          show-icon
          style="margin-bottom: 15px"
        />

        <div
          v-for="agent in redeployAgents"
          :key="agent.agentId"
          style="margin-bottom: 20px"
        >
          <div style="margin-bottom: 8px; font-weight: bold">
            <el-icon><Monitor /></el-icon>
            {{ agent.agentName }}
            <span
              style="
                margin-left: 10px;
                font-size: 12px;
                font-weight: normal;
                color: #666;
              "
            >
              ({{ agent.agentIp }}:{{ agent.agentPort }})
            </span>
          </div>

          <div style="margin-left: 24px">
            <div v-if="agent.containers && agent.containers.length > 0">
              <div style="margin-bottom: 8px; font-size: 12px; color: #666">
                已部署的容器（默认全部选中）：
              </div>
              <el-checkbox-group v-model="agent.selectedContainers">
                <div
                  v-for="container in agent.containers"
                  :key="container.names"
                  style="margin-bottom: 8px"
                >
                  <el-checkbox :label="container.names" :value="true">
                    {{ container.names }} ({{ container.image }})
                    <el-tag
                      size="mini"
                      :type="
                        container.status.includes('Up') ? 'success' : 'danger'
                      "
                    >
                      {{
                        container.status.includes("Up") ? "运行中" : "已停止"
                      }}
                    </el-tag>
                  </el-checkbox>
                </div>
              </el-checkbox-group>
            </div>
            <div v-else style="font-size: 12px; color: #f56c6c">
              该Agent上暂无部署的容器
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="rebuildDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleRebuild"
          :loading="redeployLoading"
          :disabled="!hasSelectedContainers"
        >
          重新构建
        </el-button>
      </template>
    </el-dialog>

    <!-- 部署状态对话框 -->
    <el-dialog
      v-model="statusDialogVisible"
      :title="`部署状态 - ${currentJarName}`"
      width="800px"
    >
      <div v-if="deployStatus">
        <el-row :gutter="20" style="margin-bottom: 20px">
          <el-col :span="6">
            <div style="text-align: center">
              <div style="font-size: 24px; font-weight: bold; color: #409eff">
                {{ deployStatus.total || 0 }}
              </div>
              <div style="font-size: 12px; color: #666">总部署数</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div style="text-align: center">
              <div style="font-size: 24px; font-weight: bold; color: #67c23a">
                {{ deployStatus.success || 0 }}
              </div>
              <div style="font-size: 12px; color: #666">成功</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div style="text-align: center">
              <div style="font-size: 24px; font-weight: bold; color: #f56c6c">
                {{ deployStatus.failed || 0 }}
              </div>
              <div style="font-size: 12px; color: #666">失败</div>
            </div>
          </el-col>
          <el-col :span="6">
            <div style="text-align: center">
              <div style="font-size: 24px; font-weight: bold; color: #e6a23c">
                {{ deployStatus.deploying || 0 }}
              </div>
              <div style="font-size: 12px; color: #666">部署中</div>
            </div>
          </el-col>
        </el-row>

        <el-table :data="deployStatus.deployRecords" border>
          <el-table-column label="Agent" width="150">
            <template #default="scope">
              {{ scope.row.agentName }}
            </template>
          </el-table-column>
          <el-table-column label="容器" width="150">
            <template #default="scope">
              {{ scope.row.containerName }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="部署时间" width="180">
            <template #default="scope">
              {{ scope.row.deployTime || scope.row.createTime }}
            </template>
          </el-table-column>
          <el-table-column label="日志">
            <template #default="scope">
              <div style="max-height: 60px; overflow-y: auto; font-size: 12px">
                {{ scope.row.deployLog }}
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>

    <!-- 部署日志对话框 -->
    <el-dialog
      v-model="logsDialogVisible"
      :title="`部署日志 - ${currentJarName}`"
      width="900px"
    >
      <div v-if="deployRecords && deployRecords.length > 0">
        <el-table :data="deployRecords" border>
          <el-table-column label="时间" width="180">
            <template #default="scope">
              {{ scope.row.deployTime || scope.row.createTime }}
            </template>
          </el-table-column>
          <el-table-column label="Agent" width="150">
            <template #default="scope">
              {{ scope.row.agentName }}
            </template>
          </el-table-column>
          <el-table-column label="容器" width="150">
            <template #default="scope">
              {{ scope.row.containerName }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="日志">
            <template #default="scope">
              <pre
                style="
                  max-height: 200px;
                  margin: 0;
                  overflow-y: auto;
                  font-family: monospace;
                  font-size: 12px;
                "
                >{{ scope.row.deployLog }}
              </pre>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div v-else style="padding: 40px 0; text-align: center">
        <el-empty description="暂无部署记录" />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
// 引入图标组件
import {
  Search,
  Refresh,
  Upload,
  Monitor,
  Box,
  Setting,
  RefreshRight,
  Notebook,
  Delete,
  Document,
  Edit,
  Plus,
  CircleCheck,
  Histogram,
  ArrowLeft,
} from "@element-plus/icons-vue";

import {
  listJarPackages,
  uploadJar,
  getAllAgents,
  deployJar,
  redeployJar,
  rebuildContainer,
  getAllVersions,
  getDeployRecords,
  getDeployStatus,
  deleteJar,
  getDockerfile,
  updateDockerfile,
  replaceJarFile,
} from "@/api/monitor/jar";
import { JarPackage, DeployTarget } from "@/api/monitor/jar/types";
import { listAll } from "@/api/monitor/service";
import { ServiceInfo } from "@/api/monitor/service/types";

const queryFormRef = ref(ElForm);
const uploadFormRef = ref(ElForm);
const fileInputRef = ref<HTMLInputElement>();
const replaceFileInputRef = ref<HTMLInputElement>();

const loading = ref(false);
const uploadLoading = ref(false);
const deployLoading = ref(false);
const redeployLoading = ref(false);
const dockerfileLoading = ref(false);
const replaceLoading = ref(false);
const versionsLoading = ref(false);
const ids = ref<number[]>([]);
const total = ref(0);

const queryParams = reactive({
  pageSize: 10,
  pageNum: 1,
  fileName: "",
  serviceId: undefined as number | undefined,
  status: undefined as number | undefined,
});

const dataList = ref<JarPackage[]>();
const agentsList = ref<any[]>();
const deployRecords = ref<any[]>();
const deployStatus = ref<any>();
const serviceList = ref<ServiceInfo[]>([]);
const redeployAgents = ref<any[]>([]);
const versionsList = ref<JarPackage[]>([]);

// 上传相关
const uploadDialogVisible = ref(false);
const selectedFile = ref<File>();

// Dockerfile相关
const dockerfileDialogVisible = ref(false);
const dockerfileContent = ref("");

// 部署相关
const deployDialogVisible = ref(false);
const redeployDialogVisible = ref(false);
const rebuildDialogVisible = ref(false); // 重命名变量以区分
const currentJarId = ref<number>();
const currentJarName = ref<string>();

// 替换JAR包相关
const replaceDialogVisible = ref(false);

// 版本列表相关
const versionsDialogVisible = ref(false);
const currentFileName = ref<string>("");

// 部署目标
const deployTargets = ref<DeployTarget[]>([
  {
    agentId: null,
    containerName: "",
  },
]);

// 日志相关
const logsDialogVisible = ref(false);
const statusDialogVisible = ref(false);

const uploadForm = reactive({
  serviceId: undefined as number | undefined,
  remark: "",
});

// 上传验证规则
const uploadRules = {
  serviceId: [{ required: true, message: "请选择关联服务", trigger: "change" }],
  file: [{ required: true, message: "请选择JAR文件", trigger: "change" }],
};

// 计算是否有已部署的容器
const hasDeployedContainers = computed(() => {
  return (
    redeployAgents.value?.some(
      (agent) => agent.containers && agent.containers.length > 0
    ) || false
  );
});

// 计算是否有选中的容器
const hasSelectedContainers = computed(() => {
  return (
    redeployAgents.value?.some(
      (agent) => agent.selectedContainers && agent.selectedContainers.length > 0
    ) || false
  );
});

/** 查询 */
function handleQuery() {
  loading.value = true;
  listJarPackages(queryParams).then(({ data }) => {
    dataList.value = data.records;
    total.value = data.total;
    loading.value = false;
  });
}

/** 获取服务列表 */
function loadServiceList() {
  listAll().then(({ data }) => {
    serviceList.value = data;
  });
}

/** 重置查询 */
function resetQuery() {
  queryFormRef.value.resetFields();
  queryParams.pageNum = 1;
  handleQuery();
}

/** 显示上传对话框 */
function showUploadDialog() {
  uploadDialogVisible.value = true;
  selectedFile.value = undefined;
  uploadForm.serviceId = undefined;
  uploadForm.remark = "";
  if (uploadFormRef.value) {
    uploadFormRef.value.resetFields();
  }
}

/** 触发文件输入框 */
function triggerFileInput() {
  if (uploadDialogVisible.value) {
    fileInputRef.value?.click();
  } else if (replaceDialogVisible.value) {
    replaceFileInputRef.value?.click();
  }
}

/** 文件选择处理 */
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files[0]) {
    const file = input.files[0];

    // 验证文件类型
    if (!file.name.toLowerCase().endsWith(".jar")) {
      ElMessage.warning("请选择JAR格式的文件");
      return;
    }

    // 验证文件大小（500MB限制）
    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
      ElMessage.warning("文件大小不能超过500MB");
      return;
    }

    selectedFile.value = file;
  }
}

/** 移除文件 */
function removeFile() {
  selectedFile.value = undefined;
}

/** 格式化文件大小 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/** 上传JAR包 */
function handleUpload() {
  if (!selectedFile.value) {
    ElMessage.warning("请选择JAR文件");
    return;
  }

  if (!uploadForm.serviceId) {
    ElMessage.warning("请选择关联服务");
    return;
  }

  // 根据serviceId获取服务名称
  const selectedService = serviceList.value.find(
    (item) => item.id === uploadForm.serviceId
  );
  if (!selectedService) {
    ElMessage.warning("选择的服务不存在");
    return;
  }

  uploadLoading.value = true;
  const formData = new FormData();
  formData.append("file", selectedFile.value);
  formData.append("serviceId", uploadForm.serviceId.toString());
  formData.append("serviceName", selectedService.name);
  formData.append("remark", uploadForm.remark || "");

  uploadJar(formData)
    .then(() => {
      ElMessage.success("上传成功");
      uploadDialogVisible.value = false;
      handleQuery();
    })
    .catch((error) => {
      ElMessage.error("上传失败: " + error.response?.data?.msg);
    })
    .finally(() => {
      uploadLoading.value = false;
    });
}

/** 显示Dockerfile对话框 */
function showDockerfileDialog(jar: JarPackage) {
  currentJarId.value = jar.id;
  currentJarName.value = jar.fileName;
  dockerfileContent.value = "";

  dockerfileLoading.value = true;
  getDockerfile(jar.id!)
    .then(({ data }) => {
      // 如果已有Dockerfile内容，直接使用
      if (data && data.trim()) {
        dockerfileContent.value = data;
      } else {
        // 否则生成默认的Dockerfile，使用正确的JAR文件名
        dockerfileContent.value = getDefaultDockerfile(jar);
      }
      dockerfileDialogVisible.value = true;
    })
    .finally(() => {
      dockerfileLoading.value = false;
    });
}

/** 获取默认Dockerfile */
function getDefaultDockerfile(jar: JarPackage): string {
  const jarFileName = jar.fileName || "app.jar";
  return `FROM adoptopenjdk:8-jdk-hotspot

WORKDIR /home/park

# 复制JAR文件到容器中
COPY ${jarFileName} /home/park/

# 暴露端口
EXPOSE 8080

# 启动命令
ENTRYPOINT ["java", "-jar", "${jarFileName}"]`;
}

/** 保存Dockerfile */
function handleSaveDockerfile() {
  if (!dockerfileContent.value.trim()) {
    ElMessage.warning("Dockerfile内容不能为空");
    return;
  }

  dockerfileLoading.value = true;
  updateDockerfile(currentJarId.value!, dockerfileContent.value)
    .then(() => {
      ElMessage.success("Dockerfile保存成功");
      dockerfileDialogVisible.value = false;
      handleQuery();
    })
    .finally(() => {
      dockerfileLoading.value = false;
    });
}

/** 显示部署对话框 */
function showDeployDialog(jar: JarPackage) {
  currentJarId.value = jar.id;
  currentJarName.value = jar.fileName;

  // 检查是否已设置Dockerfile
  if (!jar.dockerfileContent || !jar.dockerfileContent.trim()) {
    ElMessage.warning("请先设置Dockerfile");
    showDockerfileDialog(jar);
    return;
  }

  getAllAgents().then(({ data }) => {
    agentsList.value = data;
    // 重置部署目标
    deployTargets.value = [
      {
        agentId: null,
        containerName: "",
      },
    ];
    deployDialogVisible.value = true;
  });
}

/** 获取容器名称占位符 */
function getContainerNamePlaceholder(jarName: string): string {
  if (!jarName) return "输入容器名称";
  const baseName = jarName
    .toLowerCase()
    .replace(/\.jar$/i, "") // 移除.jar后缀
    .replace(/[^a-z0-9]/g, "-") // 替换特殊字符为连字符
    .replace(/-+/g, "-") // 合并多个连字符
    .replace(/^-|-$/g, ""); // 移除首尾连字符
  return `${baseName}`;
}

/** 显示重新部署对话框 */
function showRedeployDialog(jar: JarPackage) {
  currentJarId.value = jar.id;
  currentJarName.value = jar.fileName;

  // 如果JAR包有已部署的目标，直接使用这些目标
  if (jar.agentIds && jar.targetContainerNames) {
    const existingAgents = jar.agentIds.split(",").map((id) => parseInt(id));
    const existingContainers = jar.targetContainerNames.split(",");

    // 按Agent分组容器
    const agentContainerMap = new Map();
    existingContainers.forEach((container, index) => {
      const agentId = existingAgents[index];
      if (!agentContainerMap.has(agentId)) {
        agentContainerMap.set(agentId, []);
      }
      agentContainerMap.get(agentId).push(container);
    });

    // 获取Agent信息并填充容器
    getAllAgents().then(({ data }) => {
      const redeployAgentsData: any[] = [];

      agentContainerMap.forEach((containers, agentId) => {
        const agent = data.find((a: any) => a.agentId === agentId);
        if (agent) {
          redeployAgentsData.push({
            agentId: agent.agentId,
            agentName: agent.agentName,
            agentIp: agent.agentIp,
            agentPort: agent.agentPort,
            selected: true,
            selectedContainers: containers, // 默认选中所有已部署的容器
            containers: containers.map((containerName: string) => ({
              names: containerName,
              image: jar.dockerImageName || "unknown",
              status: "Up", // 假设都是运行中
            })),
          });
        }
      });

      redeployAgents.value = redeployAgentsData;
      redeployDialogVisible.value = true;
    });
  } else {
    // 如果没有部署记录，显示空状态
    redeployAgents.value = [];
    redeployDialogVisible.value = true;
  }
}

/** 显示重新构建对话框 - 复用重新部署的逻辑 */
function showRebuildDialog(jar: JarPackage) {
  currentJarId.value = jar.id;
  currentJarName.value = jar.fileName;

  // 如果JAR包有已部署的目标，直接使用这些目标
  if (jar.agentIds && jar.targetContainerNames) {
    const existingAgents = jar.agentIds.split(",").map((id) => parseInt(id));
    const existingContainers = jar.targetContainerNames.split(",");

    // 按Agent分组容器
    const agentContainerMap = new Map();
    existingContainers.forEach((container, index) => {
      const agentId = existingAgents[index];
      if (!agentContainerMap.has(agentId)) {
        agentContainerMap.set(agentId, []);
      }
      agentContainerMap.get(agentId).push(container);
    });

    // 获取Agent信息并填充容器
    getAllAgents().then(({ data }) => {
      const redeployAgentsData: any[] = [];

      agentContainerMap.forEach((containers, agentId) => {
        const agent = data.find((a: any) => a.agentId === agentId);
        if (agent) {
          redeployAgentsData.push({
            agentId: agent.agentId,
            agentName: agent.agentName,
            agentIp: agent.agentIp,
            agentPort: agent.agentPort,
            selected: true,
            selectedContainers: containers, // 默认选中所有已部署的容器
            containers: containers.map((containerName: string) => ({
              names: containerName,
              image: jar.dockerImageName || "unknown",
              status: "Up", // 假设都是运行中
            })),
          });
        }
      });

      redeployAgents.value = redeployAgentsData;
      rebuildDialogVisible.value = true; // 打开重新构建对话框
    });
  } else {
    // 如果没有部署记录，显示空状态
    redeployAgents.value = [];
    rebuildDialogVisible.value = true; // 打开重新构建对话框
  }
}

/** 显示版本号对话框 */
function showVersionsDialog(fileName: string) {
  currentFileName.value = fileName;
  versionsLoading.value = true;
  getAllVersions(fileName)
    .then(({ data }) => {
      versionsList.value = data;
      versionsDialogVisible.value = true;
    })
    .finally(() => {
      versionsLoading.value = false;
    });
}

/** 显示替换对话框 */
function showReplaceDialog(jar: JarPackage) {
  currentJarId.value = jar.id;
  currentJarName.value = jar.fileName;
  selectedFile.value = undefined;
  replaceDialogVisible.value = true;
}

/** 执行替换JAR包 */
function handleReplace() {
  if (!selectedFile.value) {
    ElMessage.warning("请选择JAR文件");
    return;
  }

  const formData = new FormData();
  formData.append("file", selectedFile.value);

  replaceLoading.value = true;
  replaceJarFile(currentJarId.value!, formData)
    .then(() => {
      ElMessage.success("JAR包替换成功");
      replaceDialogVisible.value = false;
      handleQuery();
    })
    .catch((error) => {
      ElMessage.error("替换失败: " + error.response?.data?.msg);
    })
    .finally(() => {
      replaceLoading.value = false;
    });
}

/** 添加部署目标 */
function addDeployTarget() {
  deployTargets.value.push({
    agentId: null,
    containerName: "",
  });
}

/** 移除部署目标 */
function removeDeployTarget(index: number) {
  deployTargets.value.splice(index, 1);
}

/** 执行部署 */
function handleDeploy() {
  // 验证部署目标
  const agentIds: number[] = [];
  const containerNames: string[] = [];

  for (const target of deployTargets.value) {
    if (!target.agentId) {
      ElMessage.error(
        `第 ${deployTargets.value.indexOf(target) + 1} 行：请选择Agent`
      );
      return;
    }

    if (!target.containerName.trim()) {
      ElMessage.error(
        `第 ${deployTargets.value.indexOf(target) + 1} 行：请输入容器名称`
      );
      return;
    }

    agentIds.push(target.agentId);
    containerNames.push(target.containerName.trim());
  }

  deployLoading.value = true;
  deployJar(currentJarId.value!, { agentIds, containerNames })
    .then(() => {
      ElMessage.success("开始部署，系统会自动判断容器状态");
      deployDialogVisible.value = false;
      handleQuery();
    })
    .catch((error) => {
      ElMessage.error("部署失败: " + error.response?.data?.msg);
    })
    .finally(() => {
      deployLoading.value = false;
    });
}

/** 执行重新部署 */
function handleRedeploy() {
  // 收集所有已部署的Agent和容器
  const agentIds: number[] = [];
  const containerNames: string[] = [];

  redeployAgents.value?.forEach((agent) => {
    if (agent.selectedContainers && agent.selectedContainers.length > 0) {
      agent.selectedContainers.forEach((container: string) => {
        agentIds.push(agent.agentId);
        containerNames.push(container);
      });
    }
  });

  if (agentIds.length === 0) {
    ElMessage.warning("没有可重新部署的容器");
    return;
  }

  redeployLoading.value = true;

  redeployJar(currentJarId.value!, { agentIds, containerNames })
    .then(() => {
      ElMessage.success("开始重新部署");
      redeployDialogVisible.value = false;
      handleQuery();
    })
    .catch((error) => {
      ElMessage.error("重新部署失败: " + error.response?.data?.msg);
    })
    .finally(() => {
      redeployLoading.value = false;
    });
}

/** 执行重新构建 - 复用重新部署的收集逻辑，只改接口调用 */
function handleRebuild() {
  // 收集所有已部署的Agent和容器（逻辑完全复用重新部署）
  const agentIds: number[] = [];
  const containerNames: string[] = [];

  redeployAgents.value?.forEach((agent) => {
    if (agent.selectedContainers && agent.selectedContainers.length > 0) {
      agent.selectedContainers.forEach((container: string) => {
        agentIds.push(agent.agentId);
        containerNames.push(container);
      });
    }
  });

  if (agentIds.length === 0) {
    ElMessage.warning("没有可重新构建的容器");
    return;
  }

  redeployLoading.value = true; // 共用同一个loading状态

  // 这里是唯一的区别：调用重新构建接口
  rebuildContainer(currentJarId.value!, { agentIds, containerNames })
    .then(() => {
      ElMessage.success("开始重新构建容器");
      rebuildDialogVisible.value = false;
      handleQuery();
    })
    .catch((error) => {
      ElMessage.error("重新构建失败: " + error.response?.data?.msg);
    })
    .finally(() => {
      redeployLoading.value = false;
    });
}

/** 根据Agent选择自动生成容器名称 */
function generateContainerName(agentId: number, index: number) {
  const agent = agentsList.value?.find((a) => a.agentId === agentId);
  if (
    agent &&
    currentJarName.value &&
    !deployTargets.value[index].containerName
  ) {
    // 使用JAR包名作为容器名称的基础
    const baseName = getContainerNamePlaceholder(currentJarName.value);
    deployTargets.value[index].containerName = baseName;
  }
}

/** 查看部署日志 */
function viewDeployLogs(id: number) {
  currentJarId.value = id;
  getDeployRecords(id).then(({ data }) => {
    deployRecords.value = data;
    logsDialogVisible.value = true;
  });
}

/** 查看部署状态 */
function viewDeployStatus(id: number) {
  currentJarId.value = id;
  getDeployStatus(id).then(({ data }) => {
    deployStatus.value = data;
    statusDialogVisible.value = true;
  });
}

/** 删除JAR包 */
function deleteJarPackage(id: number) {
  ElMessageBox.confirm("确定要删除该JAR包?", "警告", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  }).then(() => {
    loading.value = true;
    deleteJar(id)
      .then(() => {
        ElMessage.success("删除成功");
        handleQuery();
      })
      .finally(() => (loading.value = false));
  });
}

/** 获取状态文本 */
function getStatusText(status: number): string {
  const map: { [key: number]: string } = {
    0: "未部署",
    1: "部署中",
    2: "部署成功",
    3: "部署失败",
  };
  return map[status] || "未知";
}

/** 获取状态类型 */
function getStatusType(status: number): string {
  const map: { [key: number]: string } = {
    0: "info",
    1: "warning",
    2: "success",
    3: "danger",
  };
  return map[status] || "info";
}

/** 检查是否已设置Dockerfile */
function hasDockerfile(jar: JarPackage): boolean {
  return !!jar.dockerfileContent && jar.dockerfileContent.trim().length > 0;
}

onMounted(() => {
  handleQuery();
  loadServiceList();
});
</script>

<style scoped>
.agent-info {
  display: flex;
  gap: 8px;
  align-items: center;
}

.agent-name {
  font-weight: bold;
}

.agent-detail {
  font-size: 12px;
  color: #666;
}

/* 上传区域样式 */
.upload-area {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 200px;
  padding: 20px;
  cursor: pointer;
  background-color: #fafafa;
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.upload-area:hover {
  background-color: #f0f7ff;
  border-color: #409eff;
}

.upload-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.file-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

/* 文件拖拽样式 */
.upload-area.dragover {
  background-color: #ecf5ff;
  border-color: #409eff;
  transform: scale(1.02);
}

.app-container {
  padding: 20px;
}

.search-container {
  margin-bottom: 20px;
}
</style>
