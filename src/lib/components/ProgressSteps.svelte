<script lang="ts">
	interface Step {
		id: string;
		title: string;
		description: string;
	}

	interface Props {
		steps: Step[];
		currentStep: number;
	}

	let { steps, currentStep }: Props = $props();

	function getStepStatus(stepIndex: number) {
		if (stepIndex < currentStep) return 'completed';
		if (stepIndex === currentStep) return 'current';
		return 'upcoming';
	}

	function getStepClasses(status: string) {
		switch (status) {
			case 'completed':
				return 'bg-green-600 text-white border-green-600';
			case 'current':
				return 'bg-blue-600 text-white border-blue-600';
			case 'upcoming':
			default:
				return 'bg-white text-gray-500 border-gray-300';
		}
	}

	function getConnectorClasses(stepIndex: number) {
		return stepIndex < currentStep ? 'bg-green-600' : 'bg-gray-300';
	}
</script>

<div class="w-full py-6">
	<nav
		aria-label="進度指示器"
		role="progressbar"
		aria-valuenow={currentStep + 1}
		aria-valuemin="1"
		aria-valuemax={steps.length}
	>
		<ol class="flex items-center justify-between">
			{#each steps as step, index (step.id)}
				<li
					class="flex items-center {index === steps.length - 1 ? 'flex-shrink-0' : 'flex-1'}"
					role="presentation"
				>
					<!-- Step Circle -->
					<div class="flex items-center">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-150 {getStepClasses(
								getStepStatus(index)
							)}"
							aria-current={getStepStatus(index) === 'current' ? 'step' : undefined}
						>
							{#if getStepStatus(index) === 'completed'}
								<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
									<path
										fill-rule="evenodd"
										d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
								<span class="sr-only">已完成</span>
							{:else}
								<span class="text-sm font-medium" aria-label="步驟 {index + 1}">
									{index + 1}
								</span>
							{/if}
						</div>

						<!-- Step Content -->
						<div class="ml-4 min-w-0 flex-1">
							<p class="text-sm font-medium text-gray-800">
								{step.title}
							</p>
							<p class="text-xs text-gray-500">
								{step.description}
							</p>
						</div>
					</div>

					<!-- Connector Line -->
					{#if index < steps.length - 1}
						<div
							class="mx-4 h-0.5 flex-1 transition-colors duration-150 {getConnectorClasses(
								index + 1
							)}"
							aria-hidden="true"
						></div>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>

	<!-- Progress Bar -->
	<div class="mt-6 h-2 w-full overflow-hidden rounded-full bg-gray-200" role="presentation">
		<div
			class="h-2 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 transition-all duration-300 ease-out"
			style="width: {(currentStep / (steps.length - 1)) * 100}%"
			aria-hidden="true"
		></div>
	</div>

	<!-- Screen Reader Progress Info -->
	<div class="sr-only">
		進度：第 {currentStep + 1} 步，共 {steps.length} 步。目前在{steps[currentStep]?.title ||
			''}階段。
	</div>
</div>
