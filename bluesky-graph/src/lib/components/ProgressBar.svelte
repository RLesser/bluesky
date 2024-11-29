<script lang="ts">
  export let finished: number = 0;
  export let total: number = 0;

  $: progress = total > 0 ? (finished / total) * 100 : 0;
  $: visible = total > 0;
</script>

{#if visible}
  <div class="w-full">
    <div class="progress-bar">
      <div class="progress-fill" style="width: {(finished / (total + 1)) * 100}%"></div>
    </div>
    <div class="progress-text">
      Explored {finished} of {total} nodes
    </div>
  </div>
{/if}

<style>
  .progress-bar {
    width: 100%;
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
