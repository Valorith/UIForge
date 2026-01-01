<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from './AppHeader.vue'
import ElementTree from '../panels/ElementTree.vue'
import EditorCanvas from '../canvas/EditorCanvas.vue'
import PropertyInspector from '../panels/PropertyInspector.vue'
import TexturePanel from '../panels/TexturePanel.vue'

const leftPanelSplit = ref(60) // percentage for element tree
</script>

<template>
  <div class="app-layout">
    <AppHeader />
    <div class="app-main">
      <aside class="sidebar sidebar-left">
        <div class="panel-section" :style="{ flex: leftPanelSplit / 100 }">
          <ElementTree />
        </div>
        <div class="panel-divider" />
        <div class="panel-section" :style="{ flex: (100 - leftPanelSplit) / 100 }">
          <TexturePanel />
        </div>
      </aside>
      <main class="canvas-container">
        <EditorCanvas />
      </main>
      <aside class="sidebar sidebar-right">
        <PropertyInspector />
      </aside>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.app-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: var(--sidebar-width);
  min-width: var(--panel-min-width);
  background: var(--bg-secondary);
  border-color: var(--border-color);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sidebar-left {
  border-right: 1px solid var(--border-color);
}

.sidebar-right {
  border-left: 1px solid var(--border-color);
}

.canvas-container {
  flex: 1;
  overflow: hidden;
  background: var(--bg-primary);
}

.panel-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: 100px;
}

.panel-divider {
  height: 4px;
  background: var(--border-color);
  cursor: row-resize;
  flex-shrink: 0;
}

.panel-divider:hover {
  background: var(--accent-primary);
}
</style>
