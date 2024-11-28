<script lang="ts">
  export let finished: number = 0;
  export let total: number = 0;

  $: progress = total > 0 ? (finished / total) * 100 : 0;
  $: visible = total > 0;
</script>

{#if visible}
  <div class="progress-container">
    <div class="progress-bar">
      <div class="progress-fill" style="width: {(finished / (total + 1)) * 100}%"></div>
    </div>
    <div class="progress-text">
      Explored {finished} of {total} nodes
    </div>
  </div>
{/if}

<style>
  .progress-container {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.9);
    padding: 10px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }

  .progress-bar {
    width: 200px;
    height: 8px;
    background: #eee;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: #3498db;
    transition: width 0.3s ease;
  }

  .progress-text {
    text-align: center;
    font-size: 12px;
    margin-top: 4px;
    color: #666;
  }
</style>
